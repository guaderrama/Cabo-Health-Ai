#!/usr/bin/env node

/**
 * Script para cambiar el rol de un usuario
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno
function loadEnv() {
  const envPath = resolve(__dirname, '.env');
  const envFile = readFileSync(envPath, 'utf8');
  const env = {};
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();

// Crear cliente con service role
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const userEmail = 'buy@ivanguaderrama.com';
const newRole = 'doctor';

console.log(`🔧 Cambiando rol del usuario ${userEmail} a "${newRole}"...\n`);

try {
  // Buscar el usuario por email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw listError;
  }

  const user = users.find(u => u.email === userEmail);

  if (!user) {
    console.error(`❌ No se encontró el usuario: ${userEmail}`);
    process.exit(1);
  }

  console.log(`📧 Usuario encontrado: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Rol actual: ${user.user_metadata?.role || 'no definido'}`);

  // Actualizar metadata del usuario
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        role: newRole
      }
    }
  );

  if (error) {
    throw error;
  }

  console.log(`\n✅ ¡Rol actualizado exitosamente!`);
  console.log(`   Nuevo rol: ${data.user.user_metadata.role}`);
  console.log(`\n🔄 Ahora cierra sesión y vuelve a iniciar sesión para ver el dashboard del médico.`);

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
