// =============================================================================
// GENERATE SUMMARY (OpenAI GPT-6.1 Terra, razonamiento "max")
// =============================================================================
// La llave de OpenAI vive solo aquí (secret OPENAI_API_KEY), nunca en el navegador.
// Con effort "max" OpenAI puede tardar varios minutos, más que el límite de una
// Edge Function, así que se usa background mode y el cliente consulta el estado:
//   { action: 'start',  transcript, language } -> { id, status }
//   { action: 'poll',   id }                   -> { status, summary? , error? }
//   { action: 'cancel', id }                   -> { status: 'cancelled' }
// El prompt se arma aquí (no se acepta del cliente) para que la función no sea
// un proxy abierto a OpenAI para cualquier usuario registrado.
// Si 'start' trae session_id, el resumen queda ligado a su fila de pending_summaries:
// así lo termina el servidor (finish-summaries) aunque el paciente cierre la página.
import { SUMMARY_PROMPT, type Language } from './summaryPrompt.ts';
import { createRateLimiter, errorResponse, getCorsHeaders, getUser, jsonResponse } from '../_shared/http.ts';
import { extractOutputText, OPENAI_MODEL, OPENAI_URL, openaiHeaders } from '../_shared/openai.ts';
import { dbSelect, dbUpdate } from '../_shared/db.ts';
import { PENDING_COLUMNS, saveFinishedSummary, type PendingRow } from '../_shared/finishSummary.ts';

/** Liga el resumen recién iniciado a la entrevista: del paciente dueño, o de cualquiera si lo inicia un médico. */
async function linkPendingSummary(
  sessionId: string, responseId: string, userId: string, isDoctor: boolean, email: string | null, patientDob: unknown,
): Promise<void> {
  // Una entrevista que ya tiene su resumen no vuelve a "processing"
  const filter = `session_id=eq.${encodeURIComponent(sessionId)}&status=neq.completed${isDoctor ? '' : `&user_id=eq.${userId}`}`;
  const values: Record<string, unknown> = {
    openai_response_id: responseId,
    summary_started_at: new Date().toISOString(),
    status: 'processing',
    error_message: null,
  };
  if (typeof patientDob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(patientDob)) values.patient_dob = patientDob;
  if (!isDoctor && email) values.patient_email = email;
  await dbUpdate('pending_summaries', filter, values);
}

/** Si el resumen pertenece a una entrevista, la deja guardada (o le quita el enlace si OpenAI falló). */
async function saveIfLinked(responseId: string, summaryText: string): Promise<void> {
  const [row] = await dbSelect<PendingRow>('pending_summaries', `openai_response_id=eq.${responseId}&select=${PENDING_COLUMNS}`);
  if (!row || row.status === 'completed') return;
  if (summaryText.trim().length >= 50) {
    await saveFinishedSummary(row, summaryText);
  } else {
    // El navegador reintenta con Gemini; la tarea del servidor ya no tiene nada que recoger
    await dbUpdate('pending_summaries', `id=eq.${row.id}`, { openai_response_id: null });
  }
}

const REASONING_EFFORT = 'max';
const MAX_OUTPUT_TOKENS = 100000; // Incluye tokens de razonamiento; el HTML visible ocupa ~8-12k
const MAX_TRANSCRIPT_CHARS = 200000;

// Máximo 10 resúmenes iniciados por usuario por hora
const checkStartLimit = createRateLimiter(10, 60 * 60 * 1000);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Use POST', 405, corsHeaders);
  }

  try {
    const user = await getUser(req);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Token inválido', 401, corsHeaders);
    }
    const userId = user.id;

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return errorResponse('OPENAI_NOT_CONFIGURED', 'Falta el secret OPENAI_API_KEY', 500, corsHeaders);
    }

    const body = await req.json().catch(() => null);
    const headers = openaiHeaders(apiKey);

    if (body?.action === 'start') {
      const transcript = typeof body.transcript === 'string' ? body.transcript : '';
      const language: Language = body.language === 'en' ? 'en' : 'es';

      if (transcript.trim().length < 50 || transcript.length > MAX_TRANSCRIPT_CHARS) {
        return errorResponse('INVALID_TRANSCRIPT', 'Transcripción vacía o demasiado larga', 400, corsHeaders);
      }
      if (!checkStartLimit(userId)) {
        return errorResponse('RATE_LIMIT_EXCEEDED', 'Demasiados resúmenes en la última hora', 429, corsHeaders);
      }

      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: OPENAI_MODEL,
          input: SUMMARY_PROMPT[language](transcript),
          reasoning: { effort: REASONING_EFFORT },
          max_output_tokens: MAX_OUTPUT_TOKENS,
          background: true,
          store: true, // Requerido para poder consultar el estado; se borra al terminar (ver poll)
          metadata: { user_id: userId },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return errorResponse('OPENAI_ERROR', data?.error?.message ?? `HTTP ${res.status}`, 502, corsHeaders);
      }
      if (typeof body.session_id === 'string' && body.session_id) {
        await linkPendingSummary(body.session_id, data.id, user.id, user.isDoctor, user.email, body.patient_dob)
          .catch((e) => console.error('generate-summary-openai: no se pudo ligar el resumen a su entrevista', e));
      }
      return jsonResponse({ id: data.id, status: data.status }, 200, corsHeaders);
    }

    if (body?.action === 'poll' || body?.action === 'cancel') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!/^resp_[A-Za-z0-9]+$/.test(id)) {
        return errorResponse('INVALID_ID', 'ID de respuesta inválido', 400, corsHeaders);
      }

      const res = await fetch(`${OPENAI_URL}/${id}`, { headers });
      const data = await res.json();
      if (res.status === 404 && body.action === 'poll') {
        // La tarea del servidor pudo terminarlo y borrarlo de OpenAI mientras la página esperaba:
        // se entrega el mismo resumen guardado, para que la página no lo rehaga con Gemini
        const [saved] = await dbSelect<{ user_id: string; status: string; summary: string | null }>(
          'pending_summaries', `openai_response_id=eq.${id}&select=user_id,status,summary`,
        );
        if (saved?.status === 'completed' && saved.summary && (saved.user_id === userId || user.isDoctor)) {
          return jsonResponse({ status: 'completed', summary: saved.summary, usage: null }, 200, corsHeaders);
        }
      }
      if (!res.ok) {
        return errorResponse('OPENAI_ERROR', data?.error?.message ?? `HTTP ${res.status}`, 502, corsHeaders);
      }
      // Solo quien inició el resumen puede consultarlo
      if (data.metadata?.user_id !== userId) {
        return errorResponse('FORBIDDEN', 'Este resumen no te pertenece', 403, corsHeaders);
      }

      const isRunning = data.status === 'queued' || data.status === 'in_progress';

      if (body.action === 'cancel') {
        if (isRunning) await fetch(`${OPENAI_URL}/${id}/cancel`, { method: 'POST', headers });
        await fetch(`${OPENAI_URL}/${id}`, { method: 'DELETE', headers }).catch(() => {});
        await dbUpdate('pending_summaries', `openai_response_id=eq.${id}`, { openai_response_id: null }).catch(() => {});
        return jsonResponse({ status: 'cancelled' }, 200, corsHeaders);
      }

      if (isRunning) {
        return jsonResponse({ status: data.status }, 200, corsHeaders);
      }

      // Se guarda en el servidor ANTES de borrarlo de OpenAI, por si la página se cierra justo ahora
      const summaryText = data.status === 'completed' ? extractOutputText(data) : '';
      await saveIfLinked(id, summaryText)
        .catch((e) => console.error('generate-summary-openai: no se pudo guardar el resumen en el servidor', e));

      // Estado final: borrar de OpenAI, es información médica y ya no se necesita allá
      await fetch(`${OPENAI_URL}/${id}`, { method: 'DELETE', headers }).catch(() => {});

      if (data.status === 'completed') {
        return jsonResponse({ status: 'completed', summary: summaryText, usage: data.usage ?? null }, 200, corsHeaders);
      }
      return jsonResponse({
        status: data.status,
        error: data.error?.message ?? data.incomplete_details?.reason ?? null,
      }, 200, corsHeaders);
    }

    return errorResponse('INVALID_ACTION', 'action debe ser start, poll o cancel', 400, corsHeaders);

  } catch (error) {
    console.error('generate-summary-openai error:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : String(error), 500, corsHeaders);
  }
});
