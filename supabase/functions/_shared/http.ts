// Utilidades comunes de las Edge Functions de OpenAI: CORS, respuestas JSON,
// usuario autenticado y límite de uso por usuario.

const ALLOWED_ORIGINS = [
  'https://cabo-health-nova.vercel.app',
  'https://localhost:3000',
  'https://127.0.0.1:3000',
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(code: string, message: string, status: number, corsHeaders: Record<string, string>): Response {
  return jsonResponse({ error: { code, message } }, status, corsHeaders);
}

// El anon key también es un JWT válido: hay que confirmar que es un usuario real
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
  });
  if (!res.ok) return null;

  const user = await res.json();
  return typeof user?.id === 'string' ? user.id : null;
}

// Límite en memoria por instancia: frena abusos, no es una cuota exacta
export function createRateLimiter(limit: number, windowMs: number): (userId: string) => boolean {
  const records = new Map<string, { count: number; resetAt: number }>();

  return (userId: string) => {
    const now = Date.now();
    const record = records.get(userId);
    if (!record || now > record.resetAt) {
      records.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (record.count >= limit) return false;
    record.count++;
    return true;
  };
}
