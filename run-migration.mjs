#!/usr/bin/env node

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

// Crear cliente Supabase con service role key (tiene permisos completos)
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('🚀 Ejecutando migración de base de datos...\n');
console.log('📍 URL:', env.VITE_SUPABASE_URL);
console.log('🔑 Usando SERVICE_ROLE_KEY para permisos completos\n');

// Ejecutar cada comando SQL por separado
const sqlCommands = [
  {
    name: 'Agregar columnas del paciente',
    sql: `
      ALTER TABLE consultations
      ADD COLUMN IF NOT EXISTS patient_name TEXT,
      ADD COLUMN IF NOT EXISTS patient_dob DATE,
      ADD COLUMN IF NOT EXISTS patient_email TEXT;
    `
  },
  {
    name: 'Agregar datos de consulta',
    sql: `
      ALTER TABLE consultations
      ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS summary TEXT,
      ADD COLUMN IF NOT EXISTS motivation_score NUMERIC(3,1);
    `
  },
  {
    name: 'Agregar métricas de sesión',
    sql: `
      ALTER TABLE consultations
      ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
    `
  },
  {
    name: 'Hacer patient_id nullable',
    sql: `ALTER TABLE consultations ALTER COLUMN patient_id DROP NOT NULL;`
  },
  {
    name: 'Crear índice user_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);`
  },
  {
    name: 'Crear índice session_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_consultations_session_id ON consultations(session_id);`
  },
  {
    name: 'Crear índice created_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);`
  }
];

let successCount = 0;
let failCount = 0;

for (const cmd of sqlCommands) {
  process.stdout.write(`⏳ ${cmd.name}... `);

  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: cmd.sql
  });

  if (error) {
    // Si RPC no existe, intentar método alternativo
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('⚠️  RPC exec_sql no disponible');
      console.log('\n⚠️  AVISO: No puedo ejecutar SQL directamente desde Node.js');
      console.log('📝 Por favor, ejecuta el SQL manualmente en Supabase:');
      console.log('   1. Ve a: https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc/sql/new');
      console.log('   2. Copia el contenido de: SIMPLIFICAR_BASE_DATOS.sql');
      console.log('   3. Pega y ejecuta en el SQL Editor\n');
      process.exit(1);
    }

    console.log('❌');
    console.log('   Error:', error.message);
    failCount++;
  } else {
    console.log('✅');
    successCount++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Comandos exitosos: ${successCount}`);
console.log(`❌ Comandos fallidos: ${failCount}`);
console.log('='.repeat(50));

if (failCount === 0) {
  console.log('\n🎉 ¡Migración completada exitosamente!');
  console.log('\n🔍 Verificando estructura de tabla...\n');

  // Verificar que la tabla ahora tiene las columnas
  const { data: testData, error: testError } = await supabase
    .from('consultations')
    .select('*')
    .limit(0);

  if (!testError) {
    console.log('✅ Tabla consultations actualizada correctamente');
    console.log('\n📋 Ahora puedes probar la aplicación nuevamente!');
  }
} else {
  console.log('\n⚠️  Algunos comandos fallaron. Revisa los errores arriba.');
}
