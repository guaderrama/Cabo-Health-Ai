/**
 * Terra Summary Service
 *
 * Generates the clinical summary with OpenAI GPT-6.1 Terra (reasoning effort "max")
 * through the generate-summary-openai Edge Function, so the OpenAI key never
 * reaches the browser. Max effort can take several minutes, so the function runs
 * it in background mode and this service polls until it finishes.
 */

import { logger } from '../lib/logger';
import type { Language } from '../types';
import { invokeOpenAIFunction } from './openaiFunction';

const FUNCTION_NAME = 'generate-summary-openai';
const POLL_INTERVAL_MS = 5000;
// Una entrevista corta tardó ~8 min con effort max; una de 30 min puede tardar más
const TERRA_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutos
const MAX_CONSECUTIVE_POLL_ERRORS = 3;

interface TerraResult {
  id?: string;
  status?: string;
  summary?: string;
  error?: string | { code?: string; message?: string } | null;
}

function invokeTerra(body: Record<string, unknown>): Promise<TerraResult> {
  return invokeOpenAIFunction<TerraResult>(FUNCTION_NAME, body);
}

/**
 * Returns the summary HTML. Throws on failure, timeout or an "incomplete" response,
 * so the caller can fall back to Gemini.
 */
export async function generateSummaryWithTerra(transcriptText: string, language: Language): Promise<string> {
  const started = await invokeTerra({ action: 'start', transcript: transcriptText, language });
  if (!started.id) {
    throw new Error('GPT-6.1 Terra: no se recibió ID de respuesta');
  }
  logger.debug('🧠 GPT-6.1 Terra (effort max) iniciado:', started.id);

  const deadline = Date.now() + TERRA_TIMEOUT_MS;
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    let result: TerraResult;
    try {
      result = await invokeTerra({ action: 'poll', id: started.id });
      consecutiveErrors = 0;
    } catch (pollError) {
      consecutiveErrors++;
      logger.warn(`Terra poll falló (${consecutiveErrors}/${MAX_CONSECUTIVE_POLL_ERRORS}):`, pollError);
      if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) throw pollError;
      continue;
    }

    if (result.status === 'completed') {
      logger.debug('✅ GPT-6.1 Terra completado');
      return result.summary ?? '';
    }
    if (result.status !== 'queued' && result.status !== 'in_progress') {
      const detail = typeof result.error === 'string' ? result.error : result.error?.message;
      throw new Error(`GPT-6.1 Terra terminó con estado "${result.status}"${detail ? `: ${detail}` : ''}`);
    }
  }

  // No dejar el resumen (datos médicos) guardado en OpenAI si lo abandonamos
  invokeTerra({ action: 'cancel', id: started.id }).catch(() => {});
  throw new Error(`Timeout: GPT-6.1 Terra tardó más de ${TERRA_TIMEOUT_MS / 60000} minutos`);
}
