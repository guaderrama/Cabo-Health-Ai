#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar consultas guardadas
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
      const value = match[2].trim().replace(/^[\"']|[\"']$/g, '');
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();

console.log('🔍 DIAGNÓSTICO COMPLETO DE CONSULTAS\n');
console.log('═'.repeat(80));

// Crear cliente con service role para ver TODO
const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Crear cliente con anon key (como lo usa el dashboard)
const supabaseAnon = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

try {
  // 1. Verificar TODAS las consultas con SERVICE ROLE
  console.log('\n1️⃣ CONSULTAS EN LA BASE DE DATOS (SERVICE ROLE - VE TODO):');
  console.log('─'.repeat(80));

  const { data: allConsultations, error: allError } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ Error al obtener consultas:', allError);
  } else {
    console.log(`\n✅ Total de consultas en la base de datos: ${allConsultations.length}\n`);

    if (allConsultations.length === 0) {
      console.log('⚠️ NO HAY CONSULTAS EN LA BASE DE DATOS');
      console.log('   Esto significa que la consulta NO se guardó.');
    } else {
      allConsultations.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.patient_name}`);
        console.log(`   ID: ${c.id}`);
        console.log(`   User ID: ${c.user_id}`);
        console.log(`   Email: ${c.patient_email || 'N/A'}`);
        console.log(`   Mensajes: ${c.message_count || c.transcript?.length || 0}`);
        console.log(`   Fecha: ${c.created_at}`);
        console.log('');
      });
    }
  }

  // 2. Verificar usuarios
  console.log('\n2️⃣ USUARIOS REGISTRADOS:');
  console.log('─'.repeat(80));

  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ Error al obtener usuarios:', usersError);
  } else {
    console.log(`\n✅ Total de usuarios: ${users.length}\n`);

    users.forEach((u, idx) => {
      const role = u.user_metadata?.role || u.app_metadata?.role || 'NO DEFINIDO';
      console.log(`${idx + 1}. ${u.email}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   ROL: ${role}`);
      console.log(`   Created: ${u.created_at}`);
      console.log('');
    });
  }

  // 3. Simular query del dashboard con ANON KEY
  console.log('\n3️⃣ SIMULACIÓN DE QUERY DEL DASHBOARD (ANON KEY):');
  console.log('─'.repeat(80));

  const { data: dashboardConsultations, error: dashboardError } = await supabaseAnon
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false });

  if (dashboardError) {
    console.error('❌ Error con ANON KEY:', dashboardError.message);
    console.log('\n⚠️ PROBLEMA DETECTADO: El dashboard no puede acceder a las consultas.');
    console.log('   Esto indica un problema con las políticas RLS (Row Level Security).');
  } else {
    console.log(`✅ Consultas visibles con ANON KEY: ${dashboardConsultations.length}`);

    if (dashboardConsultations.length === 0 && allConsultations.length > 0) {
      console.log('\n⚠️ PROBLEMA DETECTADO:');
      console.log('   - Las consultas EXISTEN en la base de datos');
      console.log('   - Pero NO son visibles con ANON KEY');
      console.log('   - Esto es un problema de políticas RLS');
    } else if (dashboardConsultations.length > 0) {
      console.log('\n✅ Las consultas son visibles correctamente.');
      dashboardConsultations.forEach((c, idx) => {
        console.log(`   ${idx + 1}. ${c.patient_name} - ${c.message_count || 0} mensajes`);
      });
    }
  }

  // 4. Verificar políticas RLS
  console.log('\n4️⃣ VERIFICACIÓN DE POLÍTICAS RLS:');
  console.log('─'.repeat(80));

  const { data: policies, error: policiesError } = await supabaseAdmin
    .rpc('pg_policies')
    .catch(() => ({ data: null, error: null }));

  if (!policiesError && policies) {
    const consultationPolicies = policies.filter(p => p.tablename === 'consultations');
    console.log(`\n✅ Políticas encontradas para 'consultations': ${consultationPolicies.length}\n`);

    consultationPolicies.forEach(p => {
      console.log(`- ${p.policyname} (${p.cmd})`);
      console.log(`  Using: ${p.qual || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('\n⚠️ No se pudo verificar las políticas RLS directamente.');
    console.log('   Verificar manualmente en Supabase Dashboard.');
  }

  // 5. Resumen y diagnóstico
  console.log('\n5️⃣ DIAGNÓSTICO Y RECOMENDACIONES:');
  console.log('─'.repeat(80));

  if (!allConsultations || allConsultations.length === 0) {
    console.log('\n❌ PROBLEMA: Las consultas NO se están guardando');
    console.log('\n📋 PASOS A SEGUIR:');
    console.log('1. Verificar que no haya errores en la consola del navegador');
    console.log('2. Verificar el código de SendSummaryModal.tsx');
    console.log('3. Verificar la estructura de la tabla en Supabase');
  } else if (dashboardError || (dashboardConsultations && dashboardConsultations.length === 0)) {
    console.log('\n❌ PROBLEMA: Las consultas se guardan pero no son visibles');
    console.log('\n📋 PASOS A SEGUIR:');
    console.log('1. Verificar políticas RLS en Supabase Dashboard');
    console.log('2. Asegurar que la política SELECT permite leer sin autenticación');
    console.log('3. Ejecutar: node fix-rls-policies.mjs (crear este script si no existe)');
  } else {
    console.log('\n✅ TODO PARECE ESTAR CORRECTO');
    console.log('   - Las consultas se guardan correctamente');
    console.log('   - Las consultas son visibles con ANON KEY');
    console.log('\n📋 VERIFICAR:');
    console.log('1. Cerrar sesión y volver a iniciar sesión como médico');
    console.log('2. Verificar que el usuario médico tenga el rol "doctor" en user_metadata');
    console.log('3. Limpiar caché del navegador');
  }

  console.log('\n═'.repeat(80));

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
}
