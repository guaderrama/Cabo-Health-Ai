Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('PROJECT_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Configuración de Supabase no disponible');
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No se proporcionó autorización');
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar usuario
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      throw new Error('Token inválido');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Obtener el paciente
    const patientsResponse = await fetch(
      `${supabaseUrl}/rest/v1/patients?user_id=eq.${userId}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const patients = await patientsResponse.json();

    if (!patients || patients.length === 0) {
      return new Response(JSON.stringify({ 
        data: { consultations: [] } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const patientId = patients[0].id;

    // Obtener consultas del paciente
    const consultationsResponse = await fetch(
      `${supabaseUrl}/rest/v1/consultations?patient_id=eq.${patientId}&order=created_at.desc`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!consultationsResponse.ok) {
      const errorText = await consultationsResponse.text();
      throw new Error(`Error al obtener consultas: ${errorText}`);
    }

    const consultations = await consultationsResponse.json();

    // Para cada consulta, obtener transcripciones y resumen
    const detailedConsultations = await Promise.all(
      consultations.map(async (consultation: any) => {
        // Obtener transcripciones
        const transcriptionsResponse = await fetch(
          `${supabaseUrl}/rest/v1/transcriptions?consultation_id=eq.${consultation.id}&order=timestamp.asc`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            }
          }
        );

        const transcriptions = transcriptionsResponse.ok 
          ? await transcriptionsResponse.json() 
          : [];

        // Obtener resumen
        const summaryResponse = await fetch(
          `${supabaseUrl}/rest/v1/summaries?consultation_id=eq.${consultation.id}`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            }
          }
        );

        const summaries = summaryResponse.ok 
          ? await summaryResponse.json() 
          : [];

        const summary = summaries.length > 0 ? summaries[0] : null;

        // Obtener sesión
        const sessionResponse = await fetch(
          `${supabaseUrl}/rest/v1/sessions?consultation_id=eq.${consultation.id}`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            }
          }
        );

        const sessions = sessionResponse.ok 
          ? await sessionResponse.json() 
          : [];

        const session = sessions.length > 0 ? sessions[0] : null;

        return {
          ...consultation,
          transcriptions,
          summary,
          session
        };
      })
    );

    return new Response(JSON.stringify({ 
      data: { consultations: detailedConsultations } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en get-consultations:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'GET_CONSULTATIONS_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
