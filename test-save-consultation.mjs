#!/usr/bin/env node

/**
 * Script para probar el guardado de una consulta
 * Simula el flujo exacto que usa SendSummaryModal.tsx
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

console.log('🧪 PRUEBA DE GUARDADO DE CONSULTA\n');
console.log('═'.repeat(80));

// Primero obtener el usuario web@ivanguaderrama.com que creó el usuario
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

try {
  console.log('\n1️⃣ BUSCANDO USUARIO web@ivanguaderrama.com:');
  console.log('─'.repeat(80));

  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    throw usersError;
  }

  const webUser = users.find(u => u.email === 'web@ivanguaderrama.com');

  if (!webUser) {
    console.log('❌ No se encontró el usuario web@ivanguaderrama.com');
    console.log('   Este es el usuario que reportaste que creaste.');
    console.log('\n📋 Usuarios disponibles:');
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.id})`);
    });
    process.exit(1);
  }

  console.log(`✅ Usuario encontrado:`);
  console.log(`   Email: ${webUser.email}`);
  console.log(`   ID: ${webUser.id}`);
  console.log(`   Rol: ${webUser.user_metadata?.role || 'NO DEFINIDO'}`);
  console.log(`   Created: ${webUser.created_at}`);

  // Ahora simular el guardado de una consulta como lo hace SendSummaryModal
  console.log('\n2️⃣ SIMULANDO GUARDADO DE CONSULTA:');
  console.log('─'.repeat(80));

  const testSessionId = 'test-session-' + Date.now();
  const testTranscript = [
    {
      id: Date.now() + '-1',
      sender: 'Nova',
      text: 'Hola, bienvenido a Cabo Health',
      timestamp: new Date().toISOString()
    },
    {
      id: Date.now() + '-2',
      sender: 'You',
      text: 'Hola',
      timestamp: new Date().toISOString()
    },
    {
      id: Date.now() + '-3',
      sender: 'Nova',
      text: '¿Cuál es el motivo de tu consulta?',
      timestamp: new Date().toISOString()
    }
  ];

  const testSummary = 'Este es un resumen de prueba con más de 50 caracteres para pasar la validación del modal y verificar que todo funciona correctamente.';

  const consultationData = {
    user_id: webUser.id,
    session_id: testSessionId,
    patient_name: 'Test Patient Web',
    patient_dob: '1990-01-01',
    patient_email: null,
    language: 'es',
    transcript: testTranscript,
    summary: testSummary,
    motivation_score: 5.0,
    session_duration: 120,
    message_count: testTranscript.length,
    status: 'completed',
    completed_at: new Date().toISOString()
  };

  console.log('\n📝 Datos a insertar:');
  console.log(JSON.stringify(consultationData, null, 2));

  console.log('\n🔄 Insertando con SERVICE ROLE KEY...');

  const { data: savedData, error: saveError } = await supabaseAdmin
    .from('consultations')
    .insert([consultationData])
    .select()
    .single();

  if (saveError) {
    console.error('\n❌ ERROR AL GUARDAR CON SERVICE ROLE:', saveError);
    console.error('   Código:', saveError.code);
    console.error('   Mensaje:', saveError.message);
    console.error('   Detalles:', saveError.details);

    // Este error indica qué está fallando en el código real
  } else {
    console.log('\n✅ CONSULTA GUARDADA EXITOSAMENTE CON SERVICE ROLE!');
    console.log(`   ID: ${savedData.id}`);

    // Ahora probar con ANON KEY (como lo hace el navegador)
    console.log('\n3️⃣ PROBANDO CON ANON KEY (COMO EL NAVEGADOR):');
    console.log('─'.repeat(80));

    const supabaseAnon = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY
    );

    const testSessionId2 = 'test-session-anon-' + Date.now();
    const consultationData2 = {
      user_id: webUser.id,
      session_id: testSessionId2,
      patient_name: 'Test Patient Anon',
      patient_dob: '1990-01-01',
      patient_email: null,
      language: 'es',
      transcript: testTranscript,
      summary: testSummary,
      motivation_score: 5.0,
      session_duration: 120,
      message_count: testTranscript.length,
      status: 'completed',
      completed_at: new Date().toISOString()
    };

    const { data: savedData2, error: saveError2 } = await supabaseAnon
      .from('consultations')
      .insert([consultationData2])
      .select()
      .single();

    if (saveError2) {
      console.error('\n❌ ERROR AL GUARDAR CON ANON KEY:', saveError2);
      console.error('   Código:', saveError2.code);
      console.error('   Mensaje:', saveError2.message);
      console.error('   Detalles:', saveError2.details);
      console.log('\n⚠️ PROBLEMA DETECTADO:');
      console.log('   - El guardado funciona con SERVICE ROLE');
      console.log('   - Pero NO funciona con ANON KEY');
      console.log('   - Esto indica un problema de políticas RLS para INSERT');
    } else {
      console.log('\n✅ CONSULTA GUARDADA EXITOSAMENTE CON ANON KEY!');
      console.log(`   ID: ${savedData2.id}`);

      // Limpiar las consultas de prueba
      await supabaseAdmin
        .from('consultations')
        .delete()
        .in('id', [savedData.id, savedData2.id]);

      console.log('\n🗑️  Consultas de prueba eliminadas');
    }

    console.log('\n4️⃣ VERIFICANDO CONSULTAS DEL USUARIO web@ivanguaderrama.com:');
    console.log('─'.repeat(80));

    const { data: userConsultations } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('user_id', webUser.id)
      .order('created_at', { ascending: false });

    if (userConsultations && userConsultations.length > 0) {
      console.log(`\n✅ Consultas encontradas para ${webUser.email}: ${userConsultations.length}`);
      userConsultations.forEach((c, idx) => {
        console.log(`   ${idx + 1}. ${c.patient_name} - ${c.created_at}`);
      });
    } else {
      console.log(`\n⚠️ NO hay consultas para ${webUser.email}`);
      console.log('   Esto confirma que la consulta que intentaste guardar NO se guardó.');
    }
  }

  console.log('\n═'.repeat(80));

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err);
  process.exit(1);
}
