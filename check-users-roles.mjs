#!/usr/bin/env node

/**
 * Script para verificar usuarios y sus roles
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

console.log('👥 Verificando usuarios y roles...\n');

try {
  // Obtener usuarios usando Admin API
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Error al obtener usuarios:', error.message);
    process.exit(1);
  }

  console.log(`📊 Total de usuarios: ${users.length}\n`);

  users.forEach((user, idx) => {
    console.log(`${idx + 1}. Usuario: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Creado: ${user.created_at}`);
    console.log(`   Metadata:`);
    console.log(`      user_metadata:`, JSON.stringify(user.user_metadata || {}, null, 6));
    console.log(`      app_metadata:`, JSON.stringify(user.app_metadata || {}, null, 6));

    // Verificar rol
    const role = user.user_metadata?.role || user.app_metadata?.role || 'patient';
    console.log(`   🏷️  ROL: ${role}`);
    console.log('');
  });

  // Mostrar IDs de las consultas
  console.log('\n📋 Verificando user_id en consultations:');
  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, patient_name, user_id, created_at');

  consultations?.forEach(c => {
    console.log(`   - "${c.patient_name}" → user_id: ${c.user_id}`);
    const matchingUser = users.find(u => u.id === c.user_id);
    if (matchingUser) {
      console.log(`     ✅ Usuario encontrado: ${matchingUser.email}`);
    } else {
      console.log(`     ❌ Usuario NO encontrado en la lista`);
    }
  });

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
