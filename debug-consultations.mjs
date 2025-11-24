#!/usr/bin/env node

/**
 * Script para verificar consultas en Supabase
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

// Crear cliente de Supabase
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando consultas en Supabase...\n');
console.log('URL:', env.VITE_SUPABASE_URL);
console.log('');

try {
  // Obtener todas las consultas
  const { data: consultations, error } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error al obtener consultas:', error);
    process.exit(1);
  }

  console.log(`📊 Total de consultas encontradas: ${consultations?.length || 0}\n`);

  if (consultations && consultations.length > 0) {
    console.log('📋 Últimas consultas:\n');
    consultations.forEach((c, idx) => {
      console.log(`${idx + 1}. ID: ${c.id}`);
      console.log(`   Paciente: ${c.patient_name || 'N/A'}`);
      console.log(`   Fecha: ${c.created_at}`);
      console.log(`   Email paciente: ${c.patient_email || 'null'}`);
      console.log(`   Mensajes: ${c.message_count || c.transcript?.length || 0}`);
      console.log(`   Duración: ${c.session_duration || 0} segundos`);
      console.log(`   Status: ${c.status || 'N/A'}`);
      console.log(`   User ID: ${c.user_id}`);
      console.log('');
    });

    // Verificar estructura de la última consulta
    console.log('\n🔎 Detalles de la última consulta:');
    console.log(JSON.stringify(consultations[0], null, 2));
  } else {
    console.log('⚠️  No se encontraron consultas en la base de datos');
  }

  // Verificar estructura de la tabla
  console.log('\n📐 Verificando estructura de la tabla consultations...');
  const { data: tableInfo, error: tableError } = await supabase
    .from('consultations')
    .select('*')
    .limit(1);

  if (tableInfo && tableInfo.length > 0) {
    console.log('✅ Columnas disponibles:', Object.keys(tableInfo[0]).join(', '));
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
