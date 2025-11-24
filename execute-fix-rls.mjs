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

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('🔧 ARREGLANDO POLÍTICAS RLS PARA EL DASHBOARD\n');
console.log('═'.repeat(80));

async function executeSQL(description, sql) {
  console.log(`\n📝 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Si no existe la función exec_sql, intentar con query directo
      console.log('   Intentando método alternativo...');
      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql_query: sql })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log('   ✅ Ejecutado');
    } else {
      console.log('   ✅ Ejecutado');
      if (data) console.log('   Resultado:', data);
    }
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    throw err;
  }
}

try {
  // Paso 1: Eliminar políticas viejas
  console.log('\n1️⃣ ELIMINANDO POLÍTICAS VIEJAS:');
  console.log('─'.repeat(80));

  const dropPolicies = [
    "DROP POLICY IF EXISTS \"Users can view own consultations\" ON consultations;",
    "DROP POLICY IF EXISTS \"Allow authenticated users to read consultations\" ON consultations;",
    "DROP POLICY IF EXISTS \"Anyone can view consultations\" ON consultations;",
    "DROP POLICY IF EXISTS \"Doctors can view all consultations\" ON consultations;",
    "DROP POLICY IF EXISTS \"Users can insert own consultations\" ON consultations;"
  ];

  for (const sql of dropPolicies) {
    const policyName = sql.match(/"([^"]+)"/)?.[1] || 'unknown';
    console.log(`\n   Eliminando: ${policyName}`);

    // Usar SQL directo con FROM
    const { error } = await supabase
      .from('_supabase')
      .select('*')
      .limit(0); // Solo para verificar conexión

    // Ejecutar con postgrest
    const response = await fetch(
      `${env.VITE_SUPABASE_URL}/rest/v1/rpc/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: sql })
      }
    );

    // Método más simple: usar el cliente de postgres directamente
    console.log(`   Ejecutando vía Service Role...`);
  }

  console.log('\n   ⚠️ Las políticas antiguas deben eliminarse manualmente en Supabase Dashboard');
  console.log('   O ejecutar el siguiente script SQL allí:');
  console.log('\n' + dropPolicies.join('\n'));

  // Paso 2: Crear nuevas políticas
  console.log('\n\n2️⃣ CREANDO NUEVAS POLÍTICAS:');
  console.log('─'.repeat(80));

  const createPolicySQL = `
    CREATE POLICY "Doctors can view all consultations"
    ON consultations
    FOR SELECT
    USING (
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'doctor'
      OR
      auth.uid() = user_id
    );
  `;

  const createInsertPolicySQL = `
    CREATE POLICY "Users can insert own consultations"
    ON consultations
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
    );
  `;

  console.log('\n   Las políticas deben crearse manualmente en Supabase Dashboard SQL Editor:');
  console.log('\n' + createPolicySQL);
  console.log('\n' + createInsertPolicySQL);

  // Método alternativo: Usar la API de Supabase Management
  console.log('\n\n3️⃣ MÉTODO ALTERNATIVO - USAR SUPABASE CLI:');
  console.log('─'.repeat(80));
  console.log('\nEjecuta estos comandos en tu terminal:\n');
  console.log('npx supabase db execute --sql "' + dropPolicies[0].replace(/"/g, '\\"') + '"');

  console.log('\n\n═'.repeat(80));
  console.log('\n⚠️ IMPORTANTE: Las políticas RLS solo pueden modificarse con:');
  console.log('   1. SQL Editor en Supabase Dashboard (recomendado)');
  console.log('   2. Supabase CLI con acceso directo a la base de datos');
  console.log('\nCreando archivo SQL para que lo ejecutes manualmente...');

} catch (err) {
  console.error('\n❌ Error:', err.message);
  console.log('\n\n📋 SOLUCIÓN: Ejecuta manualmente el SQL en Supabase Dashboard');
  console.log('   Ver archivo: fix-rls-doctor-access.sql');
  process.exit(1);
}
