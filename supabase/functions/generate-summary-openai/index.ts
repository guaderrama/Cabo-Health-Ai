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
import { SUMMARY_PROMPT, type Language } from './summaryPrompt.ts';
import { createRateLimiter, errorResponse, getCorsHeaders, getUserId, jsonResponse } from '../_shared/http.ts';
import { extractOutputText, OPENAI_MODEL, OPENAI_URL, openaiHeaders } from '../_shared/openai.ts';

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
    const userId = await getUserId(req);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'Token inválido', 401, corsHeaders);
    }

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
      return jsonResponse({ id: data.id, status: data.status }, 200, corsHeaders);
    }

    if (body?.action === 'poll' || body?.action === 'cancel') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!/^resp_[A-Za-z0-9]+$/.test(id)) {
        return errorResponse('INVALID_ID', 'ID de respuesta inválido', 400, corsHeaders);
      }

      const res = await fetch(`${OPENAI_URL}/${id}`, { headers });
      const data = await res.json();
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
        return jsonResponse({ status: 'cancelled' }, 200, corsHeaders);
      }

      if (isRunning) {
        return jsonResponse({ status: data.status }, 200, corsHeaders);
      }

      // Estado final: borrar de OpenAI, es información médica y ya no se necesita allá
      await fetch(`${OPENAI_URL}/${id}`, { method: 'DELETE', headers }).catch(() => {});

      if (data.status === 'completed') {
        return jsonResponse({ status: 'completed', summary: extractOutputText(data), usage: data.usage ?? null }, 200, corsHeaders);
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
