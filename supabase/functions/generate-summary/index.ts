// =============================================================================
// CORS SEGURO - Lista blanca de dominios permitidos
// =============================================================================
const ALLOWED_ORIGINS = [
  'https://cabo-health-nova.vercel.app',
  'https://etric4luf0vq.space.minimax.io',
  'https://localhost:3000',
  'https://127.0.0.1:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// =============================================================================
// UTILIDADES - Fetch con Timeout
// =============================================================================
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 60000 // 60 segundos por defecto
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// VALIDACIÓN DE INPUTS
// =============================================================================
function validateLanguage(lang: unknown): 'es' | 'en' {
  return lang === 'en' ? 'en' : 'es';
}

function validateTranscript(transcript: unknown): string | null {
  if (typeof transcript !== 'string') return null;
  if (transcript.length < 10) return null;
  if (transcript.length > 100000) return null; // Max 100KB
  return transcript.slice(0, 100000);
}

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const { transcript: rawTranscript, language: rawLanguage } = rawBody;

    // Validar inputs
    const transcript = validateTranscript(rawTranscript);
    if (!transcript) {
      throw new Error('transcript es requerido y debe tener entre 10 y 100000 caracteres');
    }

    const language = validateLanguage(rawLanguage);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno de Supabase. Por favor, configúrala en el Dashboard de Supabase > Settings > Environment Variables');
    }

    // Crear el prompt según el idioma
    const prompts = {
      es: `Eres un experto médico analista de IA. Tu tarea es analizar la siguiente transcripción de una entrevista clínica y generar un resumen estructurado y profesional en formato SOAP (Subjetivo, Objetivo, Apreciación, Plan).

El resumen DEBE estar en **Español**.

El resultado DEBE ser un fragmento de HTML bien formateado. Usa etiquetas <h2> para los títulos SOAP, <p> para párrafos, <ul> y <li> para listas, y <strong> para resaltar términos clave. No incluyas las etiquetas <html> o <body> en tu respuesta, solo el contenido que iría dentro de la etiqueta body.

TRANSCRIPCIÓN:
---
${transcript}
---

Genera el resumen SOAP en HTML ahora.`,
      en: `You are an expert medical AI analyst. Your task is to analyze the following clinical interview transcript and generate a professional, structured summary in SOAP format (Subjective, Objective, Assessment, Plan).

The summary MUST be in **English**.

The output MUST be a well-formatted HTML snippet. Use <h2> for SOAP headings, <p> for paragraphs, <ul> and <li> for lists, and <strong> for key terms. Do not include <html> or <body> tags.

TRANSCRIPT:
---
${transcript}
---

Generate the SOAP summary in HTML now.`
    };

    const prompt = prompts[language];

    // Llamar a la API de Gemini con timeout de 90 segundos
    const geminiResponse = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      },
      90000 // 90 segundos para Gemini (puede tardar)
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      throw new Error(`Error de Gemini API: ${errorData}`);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('No se generó respuesta de Gemini');
    }

    const summaryHtml = geminiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({
      data: {
        summary: summaryHtml
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en generate-summary:', errorMessage);

    return new Response(JSON.stringify({
      error: {
        code: 'GENERATE_SUMMARY_FAILED',
        message: errorMessage
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
