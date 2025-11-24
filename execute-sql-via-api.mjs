#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

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

const projectRef = env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const accessToken = env.SUPABASE_ACCESS_TOKEN || 'sbp_fa47ecbc5d070cde94f3852de098e6fadf7560be';

console.log('🔧 EJECUTANDO SQL VIA MANAGEMENT API\n');
console.log('═'.repeat(80));
console.log(`\nProyecto: ${projectRef}`);
console.log(`Token: ${accessToken.substring(0, 10)}...`);

const sqlStatements = `
-- Eliminar políticas viejas
DROP POLICY IF EXISTS "Users can view own consultations" ON consultations;
DROP POLICY IF EXISTS "Allow authenticated users to read consultations" ON consultations;
DROP POLICY IF EXISTS "Anyone can view consultations" ON consultations;
DROP POLICY IF EXISTS "Doctors can view all consultations" ON consultations;
DROP POLICY IF EXISTS "Users can insert own consultations" ON consultations;

-- Crear nuevas políticas
CREATE POLICY "Doctors can view all consultations"
ON consultations
FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'doctor'
  OR
  auth.uid() = user_id
);

CREATE POLICY "Users can insert own consultations"
ON consultations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);
`;

async function executeSQLViaAPI(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ SQL ejecutado exitosamente');
          resolve(responseData);
        } else {
          console.error(`❌ Error HTTP ${res.statusCode}`);
          console.error('Response:', responseData);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error de red:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

console.log('\n📝 Ejecutando SQL...\n');

try {
  const result = await executeSQLViaAPI(sqlStatements);
  console.log('\n✅ POLÍTICAS RLS ACTUALIZADAS EXITOSAMENTE!\n');
  console.log('Resultado:', result);
  console.log('\n═'.repeat(80));
  console.log('\n🎉 Ahora recarga el dashboard del médico para ver todas las consultas.');
} catch (error) {
  console.error('\n❌ Error al ejecutar SQL:', error.message);
  console.log('\n⚠️ Fallback: Debes ejecutar el SQL manualmente');
  console.log('\n🔗 Ve a: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('\n📋 Y ejecuta el SQL del archivo: fix-rls-doctor-access.sql');
}
