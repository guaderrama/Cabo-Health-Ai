Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { transcript, language } = await req.json();

    if (!transcript || !language) {
      throw new Error('Faltan parámetros: transcript y language son requeridos');
    }

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

    const prompt = prompts[language as 'es' | 'en'] || prompts.es;

    // Llamar a la API de Gemini
    const geminiResponse = await fetch(
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
      }
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

  } catch (error) {
    console.error('Error en generate-summary:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'GENERATE_SUMMARY_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
