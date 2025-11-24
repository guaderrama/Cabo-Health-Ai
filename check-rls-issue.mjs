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

console.log('🔍 DIAGNÓSTICO DE PROBLEMA RLS\n');
console.log('═'.repeat(80));

// Service role (ve TODO)
const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Anon key (como el dashboard)
const supabaseAnon = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

try {
  // 1. Todas las consultas con SERVICE ROLE
  console.log('\n1️⃣ CONSULTAS CON SERVICE ROLE (VE TODO):');
  console.log('─'.repeat(80));

  const { data: allConsultations } = await supabaseAdmin
    .from('consultations')
    .select('id, patient_name, user_id, created_at')
    .order('created_at', { ascending: false });

  console.log(`Total: ${allConsultations.length}\n`);
  allConsultations.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.patient_name}`);
    console.log(`   ID: ${c.id}`);
    console.log(`   User: ${c.user_id}`);
    console.log(`   Fecha: ${c.created_at}`);
    console.log('');
  });

  // 2. Consultas con ANON KEY (como dashboard)
  console.log('\n2️⃣ CONSULTAS CON ANON KEY (COMO DASHBOARD):');
  console.log('─'.repeat(80));

  const { data: anonConsultations, error: anonError } = await supabaseAnon
    .from('consultations')
    .select('id, patient_name, user_id, created_at')
    .order('created_at', { ascending: false });

  if (anonError) {
    console.error('❌ Error:', anonError.message);
  } else {
    console.log(`Total: ${anonConsultations.length}\n`);
    anonConsultations.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.patient_name}`);
      console.log(`   ID: ${c.id}`);
      console.log(`   User: ${c.user_id}`);
      console.log(`   Fecha: ${c.created_at}`);
      console.log('');
    });
  }

  // 3. Comparar
  console.log('\n3️⃣ COMPARACIÓN:');
  console.log('─'.repeat(80));

  const allIds = allConsultations.map(c => c.id);
  const anonIds = anonConsultations ? anonConsultations.map(c => c.id) : [];
  const missingIds = allIds.filter(id => !anonIds.includes(id));

  if (missingIds.length > 0) {
    console.log(`\n❌ CONSULTAS FILTRADAS POR RLS: ${missingIds.length}\n`);

    missingIds.forEach(id => {
      const consultation = allConsultations.find(c => c.id === id);
      console.log(`- ${consultation.patient_name}`);
      console.log(`  ID: ${id}`);
      console.log(`  User: ${consultation.user_id}`);
      console.log('');
    });

    console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
    console.log('   Las políticas RLS están bloqueando algunas consultas.');
    console.log('   Necesitamos revisar las políticas en Supabase Dashboard.');
  } else {
    console.log('\n✅ Todas las consultas son visibles con ANON KEY');
  }

  // 4. Verificar usuarios
  console.log('\n4️⃣ ANÁLISIS DE USUARIOS:');
  console.log('─'.repeat(80));

  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();

  const uniqueUserIds = [...new Set(allConsultations.map(c => c.user_id))];

  console.log(`\nUsuarios con consultas: ${uniqueUserIds.length}\n`);

  uniqueUserIds.forEach(userId => {
    const user = users.find(u => u.id === userId);
    const userConsultations = allConsultations.filter(c => c.user_id === userId);
    const visibleConsultations = anonConsultations ? anonConsultations.filter(c => c.user_id === userId) : [];

    console.log(`• ${user?.email || 'Usuario desconocido'}`);
    console.log(`  Total consultas: ${userConsultations.length}`);
    console.log(`  Visibles con ANON: ${visibleConsultations.length}`);
    console.log(`  Rol: ${user?.user_metadata?.role || 'NO DEFINIDO'}`);

    if (userConsultations.length !== visibleConsultations.length) {
      console.log(`  ⚠️ ${userConsultations.length - visibleConsultations.length} consultas OCULTAS`);
    }
    console.log('');
  });

  console.log('\n═'.repeat(80));

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
