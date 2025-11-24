#!/usr/bin/env node

/**
 * Script de diagnóstico para el problema del dashboard
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

console.log('🔍 DIAGNÓSTICO COMPLETO DEL DASHBOARD\n');
console.log('═'.repeat(60));

try {
  // 1. Verificar usuarios y roles
  console.log('\n1️⃣ USUARIOS Y ROLES:');
  console.log('─'.repeat(60));

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    throw usersError;
  }

  users.forEach((user, idx) => {
    const role = user.user_metadata?.role || user.app_metadata?.role || 'NO DEFINIDO';
    console.log(`\n${idx + 1}. ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   ROL: ${role}`);
    console.log(`   Created: ${user.created_at}`);
  });

  // 2. Verificar consultas en la base de datos
  console.log('\n\n2️⃣ CONSULTAS EN LA BASE DE DATOS:');
  console.log('─'.repeat(60));

  const { data: consultations, error: consultError } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });

  if (consultError) {
    throw consultError;
  }

  console.log(`\nTotal de consultas: ${consultations.length}\n`);

  consultations.forEach((c, idx) => {
    console.log(`${idx + 1}. "${c.patient_name}"`);
    console.log(`   ID: ${c.id}`);
    console.log(`   User ID: ${c.user_id}`);
    console.log(`   Mensajes: ${c.message_count || c.transcript?.length || 0}`);
    console.log(`   Fecha: ${c.created_at}`);

    // Encontrar el usuario que creó esta consulta
    const creator = users.find(u => u.id === c.user_id);
    if (creator) {
      console.log(`   ✅ Creado por: ${creator.email}`);
      const creatorRole = creator.user_metadata?.role || creator.app_metadata?.role || 'NO DEFINIDO';
      console.log(`   📝 Rol del creador: ${creatorRole}`);
    } else {
      console.log(`   ❌ Usuario no encontrado`);
    }
    console.log('');
  });

  // 3. Verificar RLS
  console.log('\n3️⃣ VERIFICACIÓN DE RLS:');
  console.log('─'.repeat(60));

  const { data: rlsStatus } = await supabase.rpc('pg_get_rls_status', {
    table_name: 'consultations'
  }).catch(() => ({ data: null }));

  if (rlsStatus) {
    console.log(`RLS habilitado: ${rlsStatus ? 'SÍ' : 'NO'}`);
  } else {
    console.log('No se pudo verificar el estado de RLS');
  }

  // 4. Simular query del dashboard
  console.log('\n4️⃣ SIMULACIÓN DE QUERY DEL DASHBOARD:');
  console.log('─'.repeat(60));
  console.log('\nUsando ANON KEY (como lo hace el dashboard):');

  const supabaseAnon = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY
  );

  // Simular autenticación con buy@ivanguaderrama.com
  const buyUser = users.find(u => u.email === 'buy@ivanguaderrama.com');

  if (buyUser) {
    console.log(`\n🔐 Simulando sesión autenticada como: ${buyUser.email}`);
    console.log(`   Rol en metadata: ${buyUser.user_metadata?.role || 'NO DEFINIDO'}`);

    // Query que usa el dashboard
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false });

    if (dashboardError) {
      console.log(`   ❌ Error: ${dashboardError.message}`);
    } else {
      console.log(`   ✅ Consultas obtenidas: ${dashboardData.length}`);
      dashboardData.forEach((c, idx) => {
        console.log(`      ${idx + 1}. ${c.patient_name} - ${c.message_count || c.transcript?.length || 0} mensajes`);
      });
    }
  }

  // 5. Resumen
  console.log('\n\n5️⃣ RESUMEN Y RECOMENDACIONES:');
  console.log('─'.repeat(60));

  const buyUserFinal = users.find(u => u.email === 'buy@ivanguaderrama.com');
  const buyRole = buyUserFinal?.user_metadata?.role || buyUserFinal?.app_metadata?.role;

  if (buyRole === 'doctor') {
    console.log('✅ El usuario buy@ivanguaderrama.com tiene el rol "doctor"');
  } else {
    console.log('❌ El usuario buy@ivanguaderrama.com NO tiene el rol "doctor"');
    console.log(`   Rol actual: ${buyRole || 'NO DEFINIDO'}`);
  }

  if (consultations.length > 0) {
    console.log(`✅ Hay ${consultations.length} consulta(s) en la base de datos`);
  } else {
    console.log('❌ No hay consultas en la base de datos');
  }

  console.log('\n📋 PASOS A SEGUIR:');
  if (buyRole !== 'doctor') {
    console.log('1. Ejecutar: node set-user-role.mjs');
  } else {
    console.log('1. Cerrar sesión en el navegador');
    console.log('2. Volver a iniciar sesión con buy@ivanguaderrama.com');
    console.log('3. Verificar que aparezca "Panel del Médico" con las consultas');
  }

  console.log('\n═'.repeat(60));

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
