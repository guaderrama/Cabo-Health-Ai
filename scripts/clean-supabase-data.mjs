#!/usr/bin/env node

/**
 * Script para limpiar datos de prueba en Supabase
 * Elimina todos los registros de las tablas principales
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer archivo .env manualmente
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
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
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar configurados en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧹 Limpiando datos de Supabase...\n');

async function cleanTable(tableName) {
  try {
    // Primero obtener el conteo
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`⚠️  Tabla '${tableName}': No existe o error al contar (${countError.message})`);
      return;
    }

    if (count === 0) {
      console.log(`✓ Tabla '${tableName}': Ya está vacía (0 registros)`);
      return;
    }

    // Eliminar todos los registros
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Condición que siempre es true para eliminar todo

    if (deleteError) {
      console.log(`❌ Error limpiando tabla '${tableName}': ${deleteError.message}`);
      return;
    }

    console.log(`✅ Tabla '${tableName}': Eliminados ${count} registros`);
  } catch (error) {
    console.log(`❌ Error procesando tabla '${tableName}': ${error.message}`);
  }
}

async function main() {
  const tables = [
    'consultations',      // Consultas completas (nuevo sistema)
    'transcriptions',     // Transcripciones separadas (sistema antiguo)
    'session_checkpoints', // Checkpoints de sesión
    'summaries'           // Resúmenes separados (si existe)
  ];

  for (const table of tables) {
    await cleanTable(table);
  }

  console.log('\n✨ Limpieza completada!');
  console.log('\n📝 Nota: Los datos de la tabla "patients" NO se eliminaron.');
  console.log('   Si deseas eliminar pacientes también, hazlo manualmente desde Supabase Dashboard.\n');
}

main().catch(console.error);
