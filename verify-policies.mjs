#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('🔍 VERIFICANDO POLÍTICAS RLS\n');
console.log('═'.repeat(80));

try {
  // Verificar políticas usando una query PostgreSQL
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .limit(1);

  // Intentar obtener información de políticas (esto puede no funcionar con la API REST)
  console.log('\n📋 CONSULTANDO POLÍTICAS...\n');

  // Método alternativo: consultar directamente
  const { data: allConsultations } = await supabase
    .from('consultations')
    .select('id, patient_name, user_id, created_at')
    .order('created_at', { ascending: false });

  console.log(`Total consultas con SERVICE ROLE: ${allConsultations.length}\n`);

  // Ahora probar con ANON KEY autenticado como buy@ivanguaderrama.com
  console.log('🔐 PROBANDO CON USUARIO buy@ivanguaderrama.com:\n');

  // Obtener usuarios
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const buyUser = users.find(u => u.email === 'buy@ivanguaderrama.com');

  if (buyUser) {
    console.log(`Usuario encontrado: ${buyUser.email}`);
    console.log(`   ID: ${buyUser.id}`);
    console.log(`   Rol en user_metadata: ${buyUser.user_metadata?.role || 'NO DEFINIDO'}`);
    console.log(`   Rol en app_metadata: ${buyUser.app_metadata?.role || 'NO DEFINIDO'}`);

    // Simular autenticación con ANON KEY
    const supabaseAnon = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY
    );

    // Intentar hacer login programáticamente (esto no funcionará sin password)
    // En su lugar, verificamos qué ve un usuario autenticado genéricamente

    console.log('\n📊 PROBANDO QUERY CON ANON KEY (sin auth):');
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('consultations')
      .select('id, patient_name, user_id')
      .order('created_at', { ascending: false });

    if (anonError) {
      console.error('   ❌ Error:', anonError.message);
    } else {
      console.log(`   ✅ Consultas visibles: ${anonData.length}`);
      anonData.forEach((c, idx) => {
        console.log(`      ${idx + 1}. ${c.patient_name} (user: ${c.user_id})`);
      });
    }

    // Verificar si el problema es el rol
    console.log('\n\n⚠️ DIAGNÓSTICO:');
    if (buyUser.user_metadata?.role !== 'doctor' && buyUser.app_metadata?.role !== 'doctor') {
      console.log('❌ PROBLEMA: El usuario buy@ivanguaderrama.com NO tiene rol "doctor"');
      console.log('   La política RLS requiere que el rol sea "doctor" en user_metadata');
      console.log('   Rol actual en user_metadata: ' + (buyUser.user_metadata?.role || 'NO DEFINIDO'));
      console.log('   Rol actual en app_metadata: ' + (buyUser.app_metadata?.role || 'NO DEFINIDO'));
      console.log('\n   SOLUCIÓN: Ejecutar node set-user-role.mjs');
    } else {
      console.log('✅ El usuario tiene el rol correcto');
      console.log('   El problema puede ser:');
      console.log('   1. Caché del navegador/sesión');
      console.log('   2. La política no se creó correctamente');
      console.log('   3. Otro problema de RLS');
    }

    // Mostrar todas las consultas y sus user_ids
    console.log('\n\n📋 TODAS LAS CONSULTAS:');
    allConsultations.forEach((c, idx) => {
      const owner = users.find(u => u.id === c.user_id);
      console.log(`\n${idx + 1}. ${c.patient_name}`);
      console.log(`   User: ${owner?.email || 'desconocido'} (${c.user_id})`);
      console.log(`   Fecha: ${c.created_at}`);

      // Verificar si buy@ivanguaderrama.com debería poder verla
      if (buyUser.user_metadata?.role === 'doctor') {
        console.log(`   ✅ Debería ser visible para ${buyUser.email} (es doctor)`);
      } else if (c.user_id === buyUser.id) {
        console.log(`   ✅ Debería ser visible para ${buyUser.email} (es suya)`);
      } else {
        console.log(`   ❌ NO debería ser visible para ${buyUser.email} (no es doctor ni es suya)`);
      }
    });
  }

  console.log('\n═'.repeat(80));

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
}
