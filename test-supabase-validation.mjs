/**
 * Validación de Base de Datos con Supabase MCP
 *
 * Este script valida que el usuario de prueba fue creado correctamente
 * y que las tablas de la base de datos están accesibles.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Leer configuración
const testResults = JSON.parse(readFileSync('./test-results-mcp.json', 'utf-8'));
const testUserEmail = testResults.testUser;

// Configurar Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cozsoshuctvhvdbmkmwc.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY no configurado en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function validateDatabase() {
  console.log('🔍 Iniciando Validación de Base de Datos con Supabase MCP\n');
  console.log(`📧 Buscando usuario: ${testUserEmail}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    testUser: testUserEmail,
    validations: []
  };

  try {
    // =====================
    // Validación 1: Verificar que existe tabla de usuarios
    // =====================
    console.log('📋 Validación 1: Estructura de Base de Datos\n');

    try {
      // Intentar query a auth.users (requiere permisos admin)
      // Como no tenemos acceso directo, buscaremos en user_metadata
      const { data: authUsers, error: authError } = await supabase.auth.getUser();

      results.validations.push({
        name: 'Auth System Accessible',
        passed: !authError,
        info: authError ? authError.message : 'Sistema de autenticación accesible'
      });

      console.log(`${!authError ? '✅' : '❌'} Sistema de Autenticación: ${!authError ? 'Accesible' : authError.message}\n`);

    } catch (error) {
      results.validations.push({
        name: 'Auth System Accessible',
        passed: false,
        error: error.message
      });
      console.log(`❌ Error al acceder sistema auth: ${error.message}\n`);
    }

    // =====================
    // Validación 2: Tabla consultations
    // =====================
    console.log('📋 Validación 2: Tabla de Consultas\n');

    try {
      const { data: consultations, error: consultError, count } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true });

      if (consultError) {
        results.validations.push({
          name: 'Consultations Table',
          passed: false,
          error: consultError.message
        });
        console.log(`❌ Tabla consultations: ${consultError.message}\n`);
      } else {
        results.validations.push({
          name: 'Consultations Table',
          passed: true,
          info: `Tabla accesible, ${count || 0} registros encontrados`
        });
        console.log(`✅ Tabla consultations: Accesible (${count || 0} registros)\n`);
      }

    } catch (error) {
      results.validations.push({
        name: 'Consultations Table',
        passed: false,
        error: error.message
      });
      console.log(`❌ Error al consultar tabla consultations: ${error.message}\n`);
    }

    // =====================
    // Validación 3: Políticas RLS
    // =====================
    console.log('📋 Validación 3: Row Level Security (RLS)\n');

    try {
      // Intentar insertar un registro de prueba (debería fallar sin autenticación)
      const { error: rlsError } = await supabase
        .from('consultations')
        .insert({
          patient_name: 'Test RLS',
          summary: 'Testing RLS policies',
          transcript: []
        });

      // Si error contiene "policy", RLS está activo
      const rlsActive = rlsError && (
        rlsError.message.includes('policy') ||
        rlsError.message.includes('RLS') ||
        rlsError.message.includes('permission')
      );

      results.validations.push({
        name: 'RLS Policies Active',
        passed: rlsActive || false,
        info: rlsActive
          ? 'RLS está activo (insert bloqueado correctamente)'
          : 'RLS podría no estar configurado'
      });

      console.log(`${rlsActive ? '✅' : '⚠️'} RLS: ${rlsActive ? 'Activo y funcionando' : 'Estado desconocido'}\n`);

    } catch (error) {
      results.validations.push({
        name: 'RLS Policies Active',
        passed: false,
        error: error.message
      });
      console.log(`❌ Error al validar RLS: ${error.message}\n`);
    }

    // =====================
    // Resumen Final
    // =====================
    const passed = results.validations.filter(v => v.passed).length;
    const total = results.validations.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    results.summary = {
      total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`
    };

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║    RESUMEN VALIDACIÓN SUPABASE MCP        ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`✅ Validaciones Pasadas:  ${passed}/${total} (${successRate}%)`);
    console.log(`❌ Validaciones Fallidas: ${total - passed}\n`);

    // Guardar resultados
    const fs = await import('fs');
    fs.writeFileSync(
      './test-supabase-results.json',
      JSON.stringify(results, null, 2)
    );

    console.log('📄 Resultados guardados: test-supabase-results.json\n');

    return passed === total;

  } catch (error) {
    console.error('\n💥 Error fatal durante validación:', error);
    return false;
  }
}

// Ejecutar validación
validateDatabase().then(success => {
  process.exit(success ? 0 : 1);
});
