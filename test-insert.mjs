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
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

console.log('🔍 Probando inserción en consultations...\n');

// Primero crear o buscar un paciente
console.log('1. Creando paciente de prueba...');
const { data: patientData, error: patientError } = await supabase
  .from('patients')
  .insert([{
    name: 'Paciente Prueba',
    email: 'test@test.com'
  }])
  .select()
  .single();

if (patientError) {
  console.log('❌ Error creando paciente:', patientError.message);
  process.exit(1);
}

console.log('✅ Paciente creado:', patientData.id);

// Ahora intentar crear consulta
console.log('\n2. Probando inserción de consulta...');
const { data, error } = await supabase
  .from('consultations')
  .insert([{
    patient_id: patientData.id,
    transcript: [{sender: 'You', text: 'Test'}],
    summary: 'Test summary'
  }])
  .select();

if (error) {
  console.log('❌ Error:', error.message);
  console.log('Details:', error.details);
} else {
  console.log('✅ Consulta creada!');
  console.log('Estructura:', Object.keys(data[0]).join(', '));
  console.log('\nContenido:');
  console.log(JSON.stringify(data[0], null, 2));

  // Limpiar
  await supabase.from('consultations').delete().eq('id', data[0].id);
  console.log('\n🗑️  Consulta de prueba eliminada');
}

// Limpiar paciente
await supabase.from('patients').delete().eq('id', patientData.id);
console.log('🗑️  Paciente de prueba eliminado');
