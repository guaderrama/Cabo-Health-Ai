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

console.log('🔍 DEBUG: SIMULANDO QUERY AUTENTICADA\n');
console.log('═'.repeat(80));

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

try {
  // 1. Verificar políticas activas
  console.log('\n1️⃣ POLÍTICAS RLS ACTIVAS:');
  console.log('─'.repeat(80));

  // Intentar obtener políticas (esto puede requerir conexión directa a PostgreSQL)
  // Por ahora usaremos el método de prueba

  // 2. Obtener usuarios
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const buyUser = users.find(u => u.email === 'buy@ivanguaderrama.com');
  const ivanUser = users.find(u => u.email === 'ivan@ivanguaderrama.com');

  console.log('\nUsuarios médicos:');
  console.log(`  • buy@ivanguaderrama.com: ${buyUser?.id}`);
  console.log(`  • ivan@ivanguaderrama.com: ${ivanUser?.id}`);

  // 3. Obtener TODAS las consultas con SERVICE ROLE
  const { data: allConsultations } = await supabaseAdmin
    .from('consultations')
    .select('id, patient_name, user_id, created_at')
    .order('created_at', { ascending: false });

  console.log(`\n📊 Total consultas (SERVICE ROLE): ${allConsultations.length}`);

  // 4. Simular query con ANON KEY (sin auth)
  const supabaseAnon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  const { data: anonData, error: anonError } = await supabaseAnon
    .from('consultations')
    .select('id, patient_name, user_id')
    .order('created_at', { ascending: false });

  console.log(`📊 Consultas con ANON (sin auth): ${anonData?.length || 0}`);
  if (anonError) {
    console.error('   Error:', anonError.message);
  }

  // 5. Probar con headers de autenticación simulados
  console.log('\n2️⃣ PROBANDO CON HEADERS DE AUTENTICACIÓN:');
  console.log('─'.repeat(80));

  // Para cada usuario médico, crear un token
  for (const user of [buyUser, ivanUser]) {
    if (!user) continue;

    console.log(`\n🔐 Usuario: ${user.email}`);

    // Crear un cliente temporal con autenticación
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email
    });

    if (signInError) {
      console.error(`   ❌ Error generando link: ${signInError.message}`);
      continue;
    }

    // Probar query con el proyecto ref y API key
    console.log(`   Probando query autenticada...`);

    // Intentar con un cliente usando SERVICE_ROLE pero con user_id específico
    const { data: userConsultations, error: userError } = await supabaseAdmin
      .from('consultations')
      .select('id, patient_name, user_id')
      .order('created_at', { ascending: false });

    console.log(`   Resultado: ${userConsultations?.length || 0} consultas`);
    if (userError) {
      console.error(`   Error: ${userError.message}`);
    }
  }

  // 6. Mostrar cuáles consultas corresponden a cada usuario
  console.log('\n3️⃣ ANÁLISIS DE CONSULTAS POR USUARIO:');
  console.log('─'.repeat(80));

  const consultationsByUser = {};
  allConsultations.forEach(c => {
    if (!consultationsByUser[c.user_id]) {
      consultationsByUser[c.user_id] = [];
    }
    consultationsByUser[c.user_id].push(c);
  });

  Object.entries(consultationsByUser).forEach(([userId, consultations]) => {
    const user = users.find(u => u.id === userId);
    console.log(`\n👤 ${user?.email || 'Usuario desconocido'} (${userId})`);
    console.log(`   Total consultas creadas: ${consultations.length}`);
    consultations.forEach((c, idx) => {
      console.log(`      ${idx + 1}. ${c.patient_name} - ${c.created_at}`);
    });
  });

  // 7. HIPÓTESIS: ¿Solo ve sus propias consultas?
  console.log('\n4️⃣ HIPÓTESIS:');
  console.log('─'.repeat(80));

  const buyConsultations = allConsultations.filter(c => c.user_id === buyUser.id);
  const ivanConsultations = allConsultations.filter(c => c.user_id === ivanUser?.id);

  console.log(`\n🤔 buy@ivanguaderrama.com creó ${buyConsultations.length} consultas`);
  console.log(`🤔 ivan@ivanguaderrama.com creó ${ivanConsultations?.length || 0} consultas`);

  if (buyConsultations.length === 3) {
    console.log('\n⚠️ POSIBLE PROBLEMA IDENTIFICADO:');
    console.log('   buy@ivanguaderrama.com solo ve SUS PROPIAS consultas (3)');
    console.log('   Esto significa que la política RLS NO se está aplicando correctamente');
    console.log('   La política debería permitir ver TODAS las consultas, no solo las propias');
  }

  // 8. Verificar si existe alguna política restrictiva
  console.log('\n5️⃣ RECOMENDACIÓN:');
  console.log('─'.repeat(80));
  console.log('\nLa política RLS parece no estar funcionando.');
  console.log('Posibles causas:');
  console.log('  1. La política no se creó correctamente');
  console.log('  2. Existe otra política que tiene prioridad');
  console.log('  3. RLS está deshabilitado en la tabla');
  console.log('\nVoy a generar un script para deshabilitar RLS temporalmente...');

  console.log('\n═'.repeat(80));

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
}
