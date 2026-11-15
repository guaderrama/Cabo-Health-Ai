// =============================================================================
// TERMINA EN EL SERVIDOR LOS RESÚMENES QUE SIGUEN CORRIENDO EN OPENAI
// =============================================================================
// El resumen (GPT-6.1 Terra, effort max) tarda varios minutos. Si el paciente cierra la
// página antes, nadie lo recogía y la entrevista no llegaba a "Mis entrevistas". Una tarea
// programada (pg_cron) llama a esta función cada minuto: revisa las entrevistas enviadas
// cuyo resumen sigue en OpenAI y guarda las que ya terminaron.
// Solo trabaja sobre filas que ya existen y es segura de llamar varias veces.
import { errorResponse, jsonResponse } from '../_shared/http.ts';
import { extractOutputText, OPENAI_URL, openaiHeaders } from '../_shared/openai.ts';
import { dbSelect } from '../_shared/db.ts';
import { markSummaryFailed, PENDING_COLUMNS, saveFinishedSummary, type PendingRow } from '../_shared/finishSummary.ts';

const MAX_PER_RUN = 10;
// Si la página del paciente sigue abierta, ella lo recoge; el servidor espera un poco
const MIN_AGE_MS = 30 * 1000;
// Igual que el límite del navegador: después de esto se da por perdido (el médico puede regenerarlo)
const GIVE_UP_AFTER_MS = 30 * 60 * 1000;
// Un error al guardar puede ser pasajero (red, base de datos): se reintenta cada minuto mucho más tiempo
const GIVE_UP_ON_ERRORS_AFTER_MS = 3 * 60 * 60 * 1000;
const NO_HEADERS = {};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Use POST', 405, NO_HEADERS);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return errorResponse('OPENAI_NOT_CONFIGURED', 'Falta el secret OPENAI_API_KEY', 500, NO_HEADERS);
  const headers = openaiHeaders(apiKey);

  const rows = await dbSelect<PendingRow>(
    'pending_summaries',
    // También "failed": si la página se rindió pero OpenAI sí terminó, el servidor aún lo guarda
    `status=in.(processing,failed)&openai_response_id=not.is.null&select=${PENDING_COLUMNS}&order=summary_started_at.asc&limit=${MAX_PER_RUN}`,
  );

  const results: Array<{ session: string; result: string }> = [];
  for (const row of rows) {
    const age = Date.now() - new Date(row.summary_started_at ?? 0).getTime();
    if (age < MIN_AGE_MS) continue;
    const responseUrl = `${OPENAI_URL}/${row.openai_response_id}`;
    try {
      const res = await fetch(responseUrl, { headers });
      if (res.status === 404) {
        // Ya no existe en OpenAI: si la página lo guardó, la fila ya no está en "processing" y esto no hace nada
        await markSummaryFailed(row, 'El resumen ya no está disponible en OpenAI');
        results.push({ session: row.session_id, result: 'perdido' });
        continue;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);

      if (data.status === 'queued' || data.status === 'in_progress') {
        if (age > GIVE_UP_AFTER_MS) {
          await fetch(`${responseUrl}/cancel`, { method: 'POST', headers }).catch(() => {});
          await fetch(responseUrl, { method: 'DELETE', headers }).catch(() => {});
          await markSummaryFailed(row, 'El resumen tardó más de 30 minutos');
          results.push({ session: row.session_id, result: 'tardó demasiado' });
        } else {
          results.push({ session: row.session_id, result: 'en proceso' });
        }
        continue;
      }

      const summary = data.status === 'completed' ? extractOutputText(data) : '';
      if (summary.trim().length >= 50) {
        await saveFinishedSummary(row, summary);
        results.push({ session: row.session_id, result: 'guardado' });
      } else {
        const reason = data.error?.message ?? data.incomplete_details?.reason ?? `estado ${data.status}`;
        await markSummaryFailed(row, `OpenAI no terminó el resumen (${reason})`);
        results.push({ session: row.session_id, result: 'falló' });
      }
      // Información médica: no se deja guardada en OpenAI
      await fetch(responseUrl, { method: 'DELETE', headers }).catch(() => {});
    } catch (error) {
      console.error(`finish-summaries: ${row.session_id}`, error);
      // Si el error se repite, no se queda ocupando lugar ni guardado en OpenAI para siempre
      if (age > GIVE_UP_ON_ERRORS_AFTER_MS) {
        await fetch(responseUrl, { method: 'DELETE', headers }).catch(() => {});
        await markSummaryFailed(row, `No se pudo guardar el resumen: ${error instanceof Error ? error.message : String(error)}`)
          .catch((e) => console.error('finish-summaries: no se pudo marcar como fallido', e));
      }
      results.push({ session: row.session_id, result: 'error' });
    }
  }

  if (results.some((r) => r.result !== 'en proceso')) console.log('finish-summaries:', JSON.stringify(results));
  return jsonResponse({ revisados: rows.length, results }, 200, NO_HEADERS);
});
