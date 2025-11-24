#!/usr/bin/env node

/**
 * Script para verificar políticas RLS y permisos
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

// Crear dos clientes: uno con service role (sin RLS) y otro con anon key (con RLS)
const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Verificando políticas RLS en tabla consultations...\n');

try {
  // 1. Con SERVICE ROLE (bypassa RLS)
  console.log('1️⃣ Usando SERVICE ROLE KEY (bypassa RLS):');
  const { data: dataAdmin, error: errorAdmin } = await supabaseAdmin
    .from('consultations')
    .select('id, patient_name, created_at')
    .limit(5);

  if (errorAdmin) {
    console.error('   ❌ Error:', errorAdmin.message);
  } else {
    console.log(`   ✅ Encontradas ${dataAdmin.length} consultas`);
    dataAdmin.forEach(c => console.log(`      - ${c.patient_name} (${c.created_at})`));
  }

  // 2. Con ANON KEY (respeta RLS) - SIN autenticación
  console.log('\n2️⃣ Usando ANON KEY (respeta RLS) - SIN autenticación:');
  const { data: dataAnon, error: errorAnon } = await supabaseAnon
    .from('consultations')
    .select('id, patient_name, created_at')
    .limit(5);

  if (errorAnon) {
    console.error('   ❌ Error:', errorAnon.message);
  } else {
    console.log(`   ✅ Encontradas ${dataAnon.length} consultas`);
    if (dataAnon.length === 0) {
      console.log('   ⚠️  RLS está bloqueando el acceso sin autenticación');
    }
  }

  // 3. Verificar políticas RLS
  console.log('\n3️⃣ Verificando políticas RLS configuradas:');
  const { data: policies, error: policiesError } = await supabaseAdmin
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'consultations');

  if (policiesError) {
    console.log('   ⚠️  No se pudieron obtener las políticas:', policiesError.message);
  } else if (policies && policies.length > 0) {
    console.log(`   ✅ ${policies.length} política(s) encontrada(s):`);
    policies.forEach(p => {
      console.log(`      - ${p.policyname}`);
      console.log(`        Comando: ${p.cmd}`);
      console.log(`        Roles: ${p.roles}`);
      console.log(`        Definición: ${p.qual || p.with_check || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️  No se encontraron políticas RLS para consultations');
  }

  // 4. Verificar si RLS está habilitado
  console.log('\n4️⃣ Verificando si RLS está habilitado en la tabla:');
  const { data: tableInfo } = await supabaseAdmin
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('tablename', 'consultations')
    .single();

  if (tableInfo) {
    console.log(`   RLS habilitado: ${tableInfo.rowsecurity ? 'SÍ ✅' : 'NO ❌'}`);
  }

} catch (err) {
  console.error('❌ Error:', err.message);
}
