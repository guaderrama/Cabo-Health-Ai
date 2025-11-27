// =============================================================================
// RATE LIMITING - Prevención de abuso
// =============================================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = 30; // Máximo 30 requests por ventana (lectura)
const RATE_LIMIT_WINDOW_MS = 60000; // Ventana de 1 minuto

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (Math.random() < 0.01) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - record.count, resetIn: record.resetAt - now };
}

function getClientId(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         'unknown';
}

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// =============================================================================
// TIPOS
// =============================================================================
interface Consultation {
  id: string;
  [key: string]: unknown;
}

interface DetailedConsultation extends Consultation {
  transcriptions: unknown[];
  summary: unknown | null;
  session: unknown | null;
}

// =============================================================================
// UTILIDADES - Fetch con Timeout
// =============================================================================
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 15000 // 15 segundos por defecto
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
// HANDLER PRINCIPAL
// =============================================================================
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Rate limiting check
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(clientId);

  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(rateLimit.resetIn / 1000)
      }
    }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
        'X-RateLimit-Remaining': '0'
      }
    });
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

    // Verificar usuario (timeout de 10 segundos)
    const userResponse = await fetchWithTimeout(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    }, 10000);

    if (!userResponse.ok) {
      throw new Error('Token inválido');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Validar que userId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error('ID de usuario inválido');
    }

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

    // Validar patientId
    if (!uuidRegex.test(patientId)) {
      throw new Error('ID de paciente inválido');
    }

    // Obtener consultas del paciente (limitado a 100)
    const consultationsResponse = await fetch(
      `${supabaseUrl}/rest/v1/consultations?patient_id=eq.${patientId}&order=created_at.desc&limit=100`,
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

    const consultations: Consultation[] = await consultationsResponse.json();

    // Para cada consulta, obtener transcripciones y resumen
    const detailedConsultations: DetailedConsultation[] = await Promise.all(
      consultations.map(async (consultation) => {
        // Validar consultation.id
        if (!uuidRegex.test(consultation.id)) {
          return {
            ...consultation,
            transcriptions: [],
            summary: null,
            session: null
          };
        }

        // Obtener transcripciones
        const transcriptionsResponse = await fetch(
          `${supabaseUrl}/rest/v1/transcriptions?consultation_id=eq.${consultation.id}&order=timestamp.asc&limit=500`,
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
          `${supabaseUrl}/rest/v1/summaries?consultation_id=eq.${consultation.id}&limit=1`,
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
          `${supabaseUrl}/rest/v1/sessions?consultation_id=eq.${consultation.id}&limit=1`,
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en get-consultations:', errorMessage);

    return new Response(JSON.stringify({
      error: {
        code: 'GET_CONSULTATIONS_FAILED',
        message: errorMessage
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
