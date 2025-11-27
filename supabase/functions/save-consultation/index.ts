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
// VALIDACIÓN DE INPUTS - Prevención de inyección
// =============================================================================
function validatePatientData(data: unknown): { valid: boolean; error?: string; sanitized?: Record<string, unknown> } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'patientData debe ser un objeto' };
  }

  const patient = data as Record<string, unknown>;

  // Validar fullName (requerido, string, max 100 chars, solo letras y espacios)
  if (typeof patient.fullName !== 'string' || patient.fullName.length === 0) {
    return { valid: false, error: 'fullName es requerido' };
  }
  if (patient.fullName.length > 100) {
    return { valid: false, error: 'fullName no puede exceder 100 caracteres' };
  }
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!nameRegex.test(patient.fullName)) {
    return { valid: false, error: 'fullName contiene caracteres no permitidos' };
  }

  // Validar email (opcional, formato válido)
  if (patient.patientEmail !== undefined && patient.patientEmail !== null && patient.patientEmail !== '') {
    if (typeof patient.patientEmail !== 'string') {
      return { valid: false, error: 'patientEmail debe ser string' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patient.patientEmail)) {
      return { valid: false, error: 'patientEmail tiene formato inválido' };
    }
  }

  // Validar doctorEmail (opcional)
  if (patient.doctorEmail !== undefined && patient.doctorEmail !== null && patient.doctorEmail !== '') {
    if (typeof patient.doctorEmail !== 'string') {
      return { valid: false, error: 'doctorEmail debe ser string' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patient.doctorEmail)) {
      return { valid: false, error: 'doctorEmail tiene formato inválido' };
    }
  }

  // Validar dob (opcional, formato fecha)
  if (patient.dob !== undefined && patient.dob !== null && patient.dob !== '') {
    if (typeof patient.dob !== 'string') {
      return { valid: false, error: 'dob debe ser string' };
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(patient.dob)) {
      return { valid: false, error: 'dob debe tener formato YYYY-MM-DD' };
    }
  }

  return {
    valid: true,
    sanitized: {
      fullName: patient.fullName.trim().slice(0, 100),
      patientEmail: patient.patientEmail ? String(patient.patientEmail).trim().slice(0, 255) : null,
      doctorEmail: patient.doctorEmail ? String(patient.doctorEmail).trim().slice(0, 255) : null,
      dob: patient.dob || null,
    }
  };
}

interface TranscriptionInput {
  sender: 'You' | 'Nova';
  text: string;
  lang: 'es' | 'en';
  timestamp: string;
  audioUrl: string | null;
}

function validateTranscriptions(data: unknown): { valid: boolean; error?: string; sanitized?: TranscriptionInput[] } {
  if (!Array.isArray(data)) {
    return { valid: false, error: 'transcriptions debe ser un array' };
  }

  if (data.length === 0) {
    return { valid: false, error: 'transcriptions no puede estar vacío' };
  }

  if (data.length > 1000) {
    return { valid: false, error: 'transcriptions excede el límite de 1000 mensajes' };
  }

  const sanitized: TranscriptionInput[] = [];

  for (let i = 0; i < data.length; i++) {
    const t = data[i];
    if (!t || typeof t !== 'object') {
      return { valid: false, error: `transcription[${i}] debe ser un objeto` };
    }

    const trans = t as Record<string, unknown>;

    if (typeof trans.sender !== 'string' || !['You', 'Nova'].includes(trans.sender)) {
      return { valid: false, error: `transcription[${i}].sender debe ser 'You' o 'Nova'` };
    }

    if (typeof trans.text !== 'string') {
      return { valid: false, error: `transcription[${i}].text debe ser string` };
    }

    if (trans.text.length > 10000) {
      return { valid: false, error: `transcription[${i}].text excede 10000 caracteres` };
    }

    sanitized.push({
      sender: trans.sender as 'You' | 'Nova',
      text: trans.text.slice(0, 10000),
      lang: trans.lang === 'en' ? 'en' : 'es',
      timestamp: typeof trans.timestamp === 'string' ? trans.timestamp : new Date().toISOString(),
      audioUrl: typeof trans.audioUrl === 'string' ? trans.audioUrl.slice(0, 500) : null,
    });
  }

  return { valid: true, sanitized };
}

function validateSessionId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  if (id.length < 10 || id.length > 100) return false;
  // Solo permitir caracteres seguros
  return /^[a-zA-Z0-9_-]+$/.test(id);
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

    // Obtener y validar datos de la consulta
    const rawBody = await req.json();
    const {
      patientData: rawPatientData,
      sessionId: rawSessionId,
      language: rawLanguage,
      transcriptions: rawTranscriptions,
      summary,
      sessionDuration
    } = rawBody;

    // Validación estricta de inputs
    if (!rawPatientData || !rawSessionId || !rawTranscriptions) {
      throw new Error('Faltan datos requeridos: patientData, sessionId, transcriptions');
    }

    // Validar sessionId
    if (!validateSessionId(rawSessionId)) {
      throw new Error('sessionId tiene formato inválido');
    }
    const sessionId = rawSessionId as string;

    // Validar language
    const language = validateLanguage(rawLanguage);

    // Validar patientData
    const patientValidation = validatePatientData(rawPatientData);
    if (!patientValidation.valid) {
      throw new Error(`Validación fallida: ${patientValidation.error}`);
    }
    const patientData = patientValidation.sanitized!;

    // Validar transcriptions
    const transcriptionsValidation = validateTranscriptions(rawTranscriptions);
    if (!transcriptionsValidation.valid) {
      throw new Error(`Validación fallida: ${transcriptionsValidation.error}`);
    }
    const transcriptions = transcriptionsValidation.sanitized!;

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

    // Guardar transcripciones (ya validadas y sanitizadas)
    const transcriptionPromises = transcriptions.map((t) =>
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
          timestamp: t.timestamp,
          audio_url: t.audioUrl
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
          html_content: typeof summary === 'string' ? summary.slice(0, 50000) : '',
          doctor_email: patientData.doctorEmail
        })
      });
    }

    // Guardar sesión
    if (sessionDuration && typeof sessionDuration === 'number' && sessionDuration > 0) {
      await fetch(`${supabaseUrl}/rest/v1/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consultation_id: consultationId,
          duration_seconds: Math.min(sessionDuration, 86400), // Max 24 horas
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en save-consultation:', errorMessage);

    return new Response(JSON.stringify({
      error: {
        code: 'SAVE_CONSULTATION_FAILED',
        message: errorMessage
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
