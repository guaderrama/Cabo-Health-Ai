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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('📋 Consultando tablas disponibles...\n');

// Intentar RPC si está disponible
try {
  const { data, error } = await supabase.rpc('get_schema_tables');
  if (!error && data) {
    console.log('Tablas encontradas:', data);
  }
} catch (e) {
  console.log('RPC no disponible');
}

// Probar selects simples en tablas conocidas
const tables = ['consultations', 'patients', 'transcriptions', 'summaries'];

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*').limit(0);

  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: Tabla existe`);
  }
}

// Intentar inserción vacía para ver schema
console.log('\n🔍 Intentando inserción vacía en consultations...');
const { data, error } = await supabase
  .from('consultations')
  .insert([{}])
  .select();

console.log('Error:', error?.message);
console.log('Details:', error?.details);
console.log('Hint:', error?.hint);
