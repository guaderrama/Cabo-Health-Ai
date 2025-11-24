#!/usr/bin/env node

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

console.log('🔧 ARREGLANDO POLÍTICAS RLS\n');
console.log('═'.repeat(80));

// Extraer project ref de la URL
const projectRef = env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ No se pudo extraer el project ref de VITE_SUPABASE_URL');
  process.exit(1);
}

console.log(`\n📋 Proyecto: ${projectRef}`);
console.log(`   URL: ${env.VITE_SUPABASE_URL}`);

// SQL statements
const sqlStatements = [
  // Eliminar políticas viejas
  { desc: 'Eliminar política view own', sql: 'DROP POLICY IF EXISTS "Users can view own consultations" ON consultations;' },
  { desc: 'Eliminar política authenticated read', sql: 'DROP POLICY IF EXISTS "Allow authenticated users to read consultations" ON consultations;' },
  { desc: 'Eliminar política anyone view', sql: 'DROP POLICY IF EXISTS "Anyone can view consultations" ON consultations;' },
  { desc: 'Eliminar política doctors view (vieja)', sql: 'DROP POLICY IF EXISTS "Doctors can view all consultations" ON consultations;' },
  { desc: 'Eliminar política insert own', sql: 'DROP POLICY IF EXISTS "Users can insert own consultations" ON consultations;' },

  // Crear nuevas políticas
  {
    desc: 'Crear política: Doctors can view all',
    sql: `CREATE POLICY "Doctors can view all consultations"
ON consultations
FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'doctor'
  OR
  auth.uid() = user_id
);`
  },
  {
    desc: 'Crear política: Users can insert',
    sql: `CREATE POLICY "Users can insert own consultations"
ON consultations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);`
  }
];

console.log('\n⚠️ Las políticas RLS solo pueden modificarse mediante:');
console.log('   1. SQL Editor en Supabase Dashboard');
console.log('   2. Conexión directa a PostgreSQL');
console.log('   3. Supabase CLI');

console.log('\n\n📋 OPCIÓN 1: SQL EDITOR EN DASHBOARD (RECOMENDADO)');
console.log('─'.repeat(80));
console.log('\n1. Ve a: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
console.log('\n2. Copia y pega este SQL:\n');

const fullSQL = sqlStatements.map(s => s.sql).join('\n\n');
console.log('```sql');
console.log(fullSQL);
console.log('```');

console.log('\n3. Haz clic en "Run" (o Ctrl+Enter)');

console.log('\n\n📋 OPCIÓN 2: USAR SUPABASE CLI');
console.log('─'.repeat(80));
console.log('\nSi tienes Supabase CLI instalado:');
console.log('\n1. Guarda el SQL en un archivo:');
console.log('   (Ya está guardado en: fix-rls-doctor-access.sql)');
console.log('\n2. Ejecuta:');
console.log('   npx supabase db execute --db-url "postgresql://..." < fix-rls-doctor-access.sql');

// Guardar en archivo para facilitar
const sqlFilePath = resolve(__dirname, 'fix-rls-doctor-access.sql');
const sqlContent = `-- Script para permitir que los médicos vean TODAS las consultas
-- Ejecutar esto en el SQL Editor de Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/${projectRef}/sql/new

${fullSQL}

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'consultations';
`;

console.log('\n\n✅ SQL guardado en: fix-rls-doctor-access.sql');
console.log('\n═'.repeat(80));
console.log('\n🔗 LINK DIRECTO:');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log('\n═'.repeat(80));

