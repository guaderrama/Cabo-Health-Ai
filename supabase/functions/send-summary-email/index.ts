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
    const { 
      summary, 
      doctorEmail, 
      patientName, 
      consultationId,
      language 
    } = await req.json();

    if (!summary || !doctorEmail || !patientName) {
      throw new Error('Faltan parámetros requeridos');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Si no hay API key de Resend, simular envío exitoso
    if (!resendApiKey) {
      console.log('RESEND_API_KEY no configurada - Simulando envío de email');
      console.log('------- EMAIL SIMULADO -------');
      console.log('Para:', doctorEmail);
      console.log('Asunto:', language === 'es' 
        ? `Resumen Clínico - ${patientName}` 
        : `Clinical Summary - ${patientName}`);
      console.log('Contenido HTML:', summary);
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
      ? `Resumen Clínico - ${patientName}` 
      : `Clinical Summary - ${patientName}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailSubject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Cabo Health Nova</h1>
          <p style="color: white; margin: 10px 0 0 0;">${language === 'es' ? 'Resumen Clínico del Paciente' : 'Patient Clinical Summary'}</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0;"><strong>${language === 'es' ? 'Paciente' : 'Patient'}:</strong> ${patientName}</p>
          <p><strong>${language === 'es' ? 'Fecha' : 'Date'}:</strong> ${new Date().toLocaleString(language)}</p>
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

  } catch (error) {
    console.error('Error en send-summary-email:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'SEND_EMAIL_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
