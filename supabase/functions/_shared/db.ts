// Acceso a la base con la llave de servicio, solo desde el servidor. Lo usan las funciones
// que terminan los resúmenes aunque el paciente ya haya cerrado la página.

const BASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...extra };
}

async function check(res: Response, what: string): Promise<Response> {
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
}

/** `query` va en formato PostgREST, ej. "session_id=eq.abc&select=id,status". */
export async function dbSelect<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${query}`, { headers: headers() });
  return (await check(res, `select ${table}`)).json();
}

/** Devuelve cuántas filas cambió. */
export async function dbUpdate(table: string, query: string, values: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(values),
  });
  return ((await (await check(res, `update ${table}`)).json()) as unknown[]).length;
}

/** Inserta y, si ya existe una fila con la misma clave, la deja como estaba. */
export async function dbInsertIgnoringDuplicates(table: string, onConflict: string, row: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
    body: JSON.stringify(row),
  });
  await check(res, `insert ${table}`);
}

export async function dbDelete(table: string, query: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${query}`, { method: 'DELETE', headers: headers() });
  await check(res, `delete ${table}`);
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users/${userId}`, { headers: headers() });
  if (!res.ok) return null;
  const user = await res.json();
  return typeof user?.email === 'string' ? user.email : null;
}
