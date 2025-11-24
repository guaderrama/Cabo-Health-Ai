#!/usr/bin/env node

/**
 * Script para ejecutar migración SQL en Supabase
 * Usa el API de Supabase Management para ejecutar SQL
 */

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
const projectRef = 'cozsoshuctvhvdbmkmwc';

console.log('🚀 Ejecutando migración de base de datos...\n');

// Comandos SQL individuales (sin \d que es específico de psql)
const sqlCommands = [
  {
    name: 'Agregar columnas del paciente',
    sql: `ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_dob DATE,
ADD COLUMN IF NOT EXISTS patient_email TEXT;`
  },
  {
    name: 'Agregar datos de consulta',
    sql: `ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS motivation_score NUMERIC(3,1);`
  },
  {
    name: 'Agregar métricas de sesión',
    sql: `ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;`
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

console.log('📝 Intentando ejecutar SQL vía API de Supabase...\n');

let successCount = 0;
let errorMessages = [];

for (const cmd of sqlCommands) {
  process.stdout.write(`⏳ ${cmd.name}... `);

  try {
    const response = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: cmd.sql })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log('❌');
      errorMessages.push(`${cmd.name}: ${error}`);
    } else {
      console.log('✅');
      successCount++;
    }
  } catch (error) {
    console.log('❌');
    errorMessages.push(`${cmd.name}: ${error.message}`);
  }
}

if (errorMessages.length > 0 && errorMessages[0].includes('not found')) {
  console.log('\n⚠️  El método RPC no está disponible en este proyecto.\n');
  console.log('📝 SOLUCIÓN: Ejecutar SQL manualmente en Supabase Dashboard:');
  console.log('   1. Abre: https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc/sql/new');
  console.log('   2. Copia el contenido del archivo: SIMPLIFICAR_BASE_DATOS.sql');
  console.log('   3. Pega en el SQL Editor');
  console.log('   4. Click en "Run" (botón verde)');
  console.log('   5. Espera mensaje: "Success. No rows returned"\n');
  console.log('✨ Después de ejecutar el SQL, refresca la aplicación y prueba de nuevo!\n');
} else {
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Comandos exitosos: ${successCount}/${sqlCommands.length}`);
  console.log('='.repeat(50));

  if (successCount === sqlCommands.length) {
    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('\n📋 Ahora puedes probar la aplicación nuevamente!');
  } else {
    console.log('\n⚠️  Algunos comandos fallaron:');
    errorMessages.forEach(msg => console.log('   -', msg));
  }
}
