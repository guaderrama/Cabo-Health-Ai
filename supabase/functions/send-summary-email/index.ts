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
// SANITIZACIÓN HTML - Prevención de XSS
// =============================================================================
function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sanitizar HTML del resumen - permite tags seguros, elimina scripts
function sanitizeSummaryHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Eliminar cualquier tag script y su contenido
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Eliminar event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Eliminar javascript: en href y src
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');

  // Eliminar data: URIs potencialmente peligrosos en src
  sanitized = sanitized.replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'src=""');

  // Eliminar tags peligrosos
  const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'style', 'link', 'meta', 'base'];
  for (const tag of dangerousTags) {
    const openTagRegex = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    const closeTagRegex = new RegExp(`</${tag}>`, 'gi');
    sanitized = sanitized.replace(openTagRegex, '');
    sanitized = sanitized.replace(closeTagRegex, '');
  }

  return sanitized;
}

// =============================================================================
// VALIDACIÓN DE INPUTS
// =============================================================================
function validateEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePatientName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  if (name.length === 0 || name.length > 100) return false;
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  return nameRegex.test(name);
}

function validateLanguage(lang: unknown): 'es' | 'en' {
  return lang === 'en' ? 'en' : 'es';
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
    const {
      summary: rawSummary,
      doctorEmail: rawDoctorEmail,
      patientName: rawPatientName,
      consultationId,
      language: rawLanguage
    } = rawBody;

    // Validación de inputs
    if (!rawSummary || !rawDoctorEmail || !rawPatientName) {
      throw new Error('Faltan parámetros requeridos: summary, doctorEmail, patientName');
    }

    if (!validateEmail(rawDoctorEmail)) {
      throw new Error('doctorEmail tiene formato inválido');
    }

    if (!validatePatientName(rawPatientName)) {
      throw new Error('patientName tiene formato inválido');
    }

    // Sanitizar inputs
    const doctorEmail = String(rawDoctorEmail).trim().slice(0, 255);
    const patientName = String(rawPatientName).trim().slice(0, 100);
    const language = validateLanguage(rawLanguage);
    const summary = sanitizeSummaryHtml(String(rawSummary).slice(0, 50000));

    // Escapar nombre para uso en HTML (prevención XSS)
    const safePatientName = escapeHtml(patientName);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Si no hay API key de Resend, simular envío exitoso
    if (!resendApiKey) {
      console.log('RESEND_API_KEY no configurada - Simulando envío de email');
      console.log('------- EMAIL SIMULADO -------');
      console.log('Para:', doctorEmail);
      console.log('Asunto:', language === 'es'
        ? `Resumen Clínico - ${patientName}`
        : `Clinical Summary - ${patientName}`);
      console.log('------------------------------');

      // Guardar que se "envió" el resumen
      const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
      const supabaseUrl = Deno.env.get('PROJECT_URL');

      if (serviceRoleKey && supabaseUrl && consultationId) {
        await fetch(`${supabaseUrl}/rest/v1/summaries?consultation_id=eq.${consultationId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            sent_at: new Date().toISOString()
          })
        });
      }

      return new Response(JSON.stringify({
        data: {
          success: true,
          simulated: true,
          message: 'Email simulado - Configure RESEND_API_KEY para envío real'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Envío real con Resend
    const emailSubject = language === 'es'
      ? `Resumen Clínico - ${safePatientName}`
      : `Clinical Summary - ${safePatientName}`;

    const dateStr = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(emailSubject)}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Cabo Health Nova</h1>
          <p style="color: white; margin: 10px 0 0 0;">${language === 'es' ? 'Resumen Clínico del Paciente' : 'Patient Clinical Summary'}</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0;"><strong>${language === 'es' ? 'Paciente' : 'Patient'}:</strong> ${safePatientName}</p>
          <p><strong>${language === 'es' ? 'Fecha' : 'Date'}:</strong> ${escapeHtml(dateStr)}</p>
          <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 20px 0;">
          ${summary}
          <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280; margin-bottom: 0;">
            ${language === 'es'
              ? 'Este es un resumen generado automáticamente por Cabo Health Nova AI. Por favor, revise cuidadosamente antes de tomar decisiones clínicas.'
              : 'This is an automatically generated summary by Cabo Health Nova AI. Please review carefully before making clinical decisions.'}
          </p>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cabo Health Nova <noreply@cabohealth.com>',
        to: [doctorEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      throw new Error(`Error al enviar email: ${errorData}`);
    }

    const emailData = await resendResponse.json();

    // Actualizar el registro del resumen
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('PROJECT_URL');

    if (serviceRoleKey && supabaseUrl && consultationId) {
      await fetch(`${supabaseUrl}/rest/v1/summaries?consultation_id=eq.${consultationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          sent_at: new Date().toISOString()
        })
      });
    }

    return new Response(JSON.stringify({
      data: {
        success: true,
        emailId: emailData.id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en send-summary-email:', errorMessage);

    return new Response(JSON.stringify({
      error: {
        code: 'SEND_EMAIL_FAILED',
        message: errorMessage
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
