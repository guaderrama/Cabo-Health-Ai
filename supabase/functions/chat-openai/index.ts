// =============================================================================
// CHAT DE NOVA EN MODO TEXTO (OpenAI GPT-6.1 Terra)
// =============================================================================
// La llave de OpenAI vive solo aquí (secret OPENAI_API_KEY), nunca en el navegador.
// El cliente manda el historial completo en cada mensaje y aquí se agregan las
// instrucciones de Nova, que no se aceptan del cliente para que la función no sea
// un proxy abierto a OpenAI. Con store:false OpenAI no guarda la conversación.
//   { language, messages: [{ role: 'user' | 'assistant', content }] } -> { text, usage }
import { SYSTEM_INSTRUCTIONS, type Language } from './systemInstructions.ts';
import { createRateLimiter, errorResponse, getCorsHeaders, getUserId, jsonResponse } from '../_shared/http.ts';
import { extractOutputText, OPENAI_MODEL, OPENAI_URL, openaiHeaders } from '../_shared/openai.ts';
import { findReferral, NO_REFERRAL_NOTE, removeReferrals } from './noReferral.ts';

// "low" responde en segundos; más esfuerzo haría esperar al paciente en cada mensaje
const REASONING_EFFORT = 'low';
const MAX_OUTPUT_TOKENS = 6000; // Incluye razonamiento; una respuesta de Nova ocupa ~100-400
const MAX_MESSAGES = 300;
const MAX_MESSAGE_CHARS = 20000;
const MAX_TOTAL_CHARS = 120000; // Una entrevista completa ronda 20-30 mil caracteres
const OPENAI_TIMEOUT_MS = 120000;

// Una entrevista completa son ~40-80 mensajes del paciente
const checkMessageLimit = createRateLimiter(150, 60 * 60 * 1000);

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;

  let totalChars = 0;
  const messages: ChatMessage[] = [];
  for (const m of value) {
    if ((m?.role !== 'user' && m?.role !== 'assistant') || typeof m.content !== 'string') return null;
    if (m.content.length > MAX_MESSAGE_CHARS) return null;
    totalChars += m.content.length;
    messages.push({ role: m.role, content: m.content });
  }

  if (totalChars > MAX_TOTAL_CHARS || messages[messages.length - 1].role !== 'user') return null;
  return messages;
}

type NovaReply = { ok: true; text: string; usage: unknown } | { ok: false; code: string; message: string };

async function askNova(apiKey: string, instructions: string, messages: ChatMessage[]): Promise<NovaReply> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: openaiHeaders(apiKey),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input: messages,
      reasoning: { effort: REASONING_EFFORT },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    }),
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, code: 'OPENAI_ERROR', message: data?.error?.message ?? `HTTP ${res.status}` };
  }
  const text = extractOutputText(data);
  if (!text.trim()) {
    const reason = data.error?.message ?? data.incomplete_details?.reason ?? `estado ${data.status}`;
    return { ok: false, code: 'EMPTY_RESPONSE', message: `OpenAI no devolvió texto (${reason})` };
  }
  return { ok: true, text, usage: data.usage ?? null };
}

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
    const language: Language = body?.language === 'en' ? 'en' : 'es';
    const messages = parseMessages(body?.messages);
    if (!messages) {
      return errorResponse('INVALID_MESSAGES', 'Historial vacío, demasiado largo o con formato inválido', 400, corsHeaders);
    }
    if (!checkMessageLimit(userId)) {
      return errorResponse('RATE_LIMIT_EXCEEDED', 'Demasiados mensajes en la última hora', 429, corsHeaders);
    }

    const reply = await askNova(apiKey, SYSTEM_INSTRUCTIONS[language], messages);
    if (!reply.ok) {
      return errorResponse(reply.code, reply.message, 502, corsHeaders);
    }
    let { text, usage } = reply;

    // Nova solo entrevista: si aun así le dice al paciente que busque valoración, vea a un
    // médico o vaya a urgencias, se le pide reescribir; si insiste, se quitan esas frases.
    const referral = findReferral(text);
    if (referral) {
      console.warn(`chat-openai: respuesta con recomendación al paciente ("${referral}"), se pide reescribir`);
      const retry = await askNova(apiKey, SYSTEM_INSTRUCTIONS[language] + NO_REFERRAL_NOTE[language], messages)
        .catch((e) => { console.error('chat-openai: falló el reintento', e); return null; });
      const candidate = retry?.ok ? retry.text : text;
      if (retry?.ok) usage = retry.usage;
      text = findReferral(candidate) ? (removeReferrals(candidate) ?? candidate) : candidate;
    }

    return jsonResponse({ text, usage }, 200, corsHeaders);

  } catch (error) {
    console.error('chat-openai error:', error);
    return errorResponse('INTERNAL_ERROR', error instanceof Error ? error.message : String(error), 500, corsHeaders);
  }
});
