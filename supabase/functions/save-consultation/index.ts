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

    // Obtener datos de la consulta
    const { 
      patientData, 
      sessionId,
      language,
      transcriptions,
      summary,
      sessionDuration 
    } = await req.json();

    if (!patientData || !sessionId || !transcriptions) {
      throw new Error('Faltan datos requeridos');
    }

    // Crear o actualizar paciente
    let patientId;
    const patientCheckResponse = await fetch(
      `${supabaseUrl}/rest/v1/patients?user_id=eq.${userId}&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const existingPatients = await patientCheckResponse.json();

    if (existingPatients && existingPatients.length > 0) {
      patientId = existingPatients[0].id;
      
      // Actualizar datos del paciente
      await fetch(`${supabaseUrl}/rest/v1/patients?id=eq.${patientId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          full_name: patientData.fullName,
          dob: patientData.dob,
          email: patientData.patientEmail,
          updated_at: new Date().toISOString()
        })
      });
    } else {
      // Crear nuevo paciente
      const newPatientResponse = await fetch(`${supabaseUrl}/rest/v1/patients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          full_name: patientData.fullName,
          dob: patientData.dob,
          email: patientData.patientEmail
        })
      });

      if (!newPatientResponse.ok) {
        const errorText = await newPatientResponse.text();
        throw new Error(`Error al crear paciente: ${errorText}`);
      }

      const newPatients = await newPatientResponse.json();
      patientId = newPatients[0].id;
    }

    // Crear consulta
    const consultationResponse = await fetch(`${supabaseUrl}/rest/v1/consultations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        patient_id: patientId,
        session_id: sessionId,
        language: language,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
    });

    if (!consultationResponse.ok) {
      const errorText = await consultationResponse.text();
      throw new Error(`Error al crear consulta: ${errorText}`);
    }

    const consultations = await consultationResponse.json();
    const consultationId = consultations[0].id;

    // Guardar transcripciones
    const transcriptionPromises = transcriptions.map((t: any) =>
      fetch(`${supabaseUrl}/rest/v1/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consultation_id: consultationId,
          sender: t.sender,
          text: t.text,
          lang: t.lang,
          timestamp: t.timestamp || new Date().toISOString(),
          audio_url: t.audioUrl || null
        })
      })
    );

    await Promise.all(transcriptionPromises);

    // Guardar resumen si existe
    if (summary && patientData.doctorEmail) {
      await fetch(`${supabaseUrl}/rest/v1/summaries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consultation_id: consultationId,
          html_content: summary,
          doctor_email: patientData.doctorEmail
        })
      });
    }

    // Guardar sesión
    if (sessionDuration) {
      await fetch(`${supabaseUrl}/rest/v1/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consultation_id: consultationId,
          duration_seconds: sessionDuration,
          end_time: new Date().toISOString()
        })
      });
    }

    return new Response(JSON.stringify({ 
      data: { 
        consultationId,
        patientId,
        success: true 
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en save-consultation:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'SAVE_CONSULTATION_FAILED',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
