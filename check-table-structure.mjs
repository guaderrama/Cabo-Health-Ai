#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
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
  } catch (error) {
    console.error('❌ Error leyendo archivo .env:', error.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Consultando estructura de la tabla consultations...\n');

// Primero intentar SELECT para ver si hay datos
const { data: existingData, error: selectError } = await supabase
  .from('consultations')
  .select('*')
  .limit(1);

if (selectError) {
  console.log('❌ Error al consultar:', selectError.message);
} else if (existingData && existingData.length > 0) {
  console.log('✅ Estructura de la tabla (basada en datos existentes):');
  console.log('Columnas encontradas:', Object.keys(existingData[0]).join(', '));
  console.log('\nEjemplo de registro:');
  console.log(JSON.stringify(existingData[0], null, 2));
} else {
  console.log('📋 Tabla vacía. Probando inserción mínima...\n');

  // Probar con solo user_id y summary
  const { data, error } = await supabase
    .from('consultations')
    .insert([{
      user_id: '00000000-0000-0000-0000-000000000000',
      summary: 'test'
    }])
    .select();

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('\nProbando solo con summary...\n');

    // Probar con menos campos
    const { data: data2, error: error2 } = await supabase
      .from('consultations')
      .insert([{ summary: 'test' }])
      .select();

    if (error2) {
      console.log('❌ Error:', error2.message);
    } else {
      console.log('✅ Inserción exitosa con solo summary!');
      console.log('Estructura devuelta:', Object.keys(data2[0]).join(', '));

      // Eliminar
      await supabase.from('consultations').delete().eq('id', data2[0].id);
      console.log('🗑️  Limpiado');
    }
  } else {
    console.log('✅ Inserción exitosa!');
    console.log('Estructura devuelta:', Object.keys(data[0]).join(', '));

    // Eliminar
    await supabase.from('consultations').delete().eq('id', data[0].id);
    console.log('🗑️  Limpiado');
  }
}
