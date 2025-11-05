#!/usr/bin/env node

/**
 * Script de diagnóstico para probar la conectividad con Gemini API
 *
 * USO:
 * 1. Asegúrate de tener el archivo .env creado con VITE_GEMINI_API_KEY
 * 2. Ejecutar: node scripts/test-gemini-api.js
 */

import 'dotenv/config';

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

// Lista de modelos a probar
const MODELS_TO_TEST = [
  'gemini-2.5-flash-native-audio-preview-09-2025',
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-exp-1206',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

console.log('🔍 DIAGNÓSTICO DE API DE GEMINI\n');
console.log('=' .repeat(60));

// Paso 1: Verificar que existe API Key
if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '' || GEMINI_API_KEY === 'tu_api_key_de_gemini_aqui') {
  console.error('❌ ERROR: VITE_GEMINI_API_KEY no está configurada correctamente');
  console.error('\n📝 PASOS PARA SOLUCIONAR:');
  console.error('1. Crear archivo .env en la raíz del proyecto');
  console.error('2. Agregar: VITE_GEMINI_API_KEY=tu_api_key_real');
  console.error('3. Obtener API key de: https://aistudio.google.com/apikey');
  console.error('4. Reiniciar el servidor de desarrollo\n');
  process.exit(1);
}

console.log('✅ API Key encontrada');
console.log(`📋 Key preview: ${GEMINI_API_KEY.substring(0, 10)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)}`);
console.log(`📏 Longitud: ${GEMINI_API_KEY.length} caracteres`);

// Validar formato de API Key
if (!GEMINI_API_KEY.startsWith('AIza')) {
  console.warn('⚠️  ADVERTENCIA: La API key no tiene el formato esperado (debería empezar con "AIza")');
}

console.log('\n' + '='.repeat(60));
console.log('🧪 PROBANDO CONECTIVIDAD CON GEMINI API\n');

// Paso 2: Probar conexión básica con API de Gemini
async function testBasicConnection() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ERROR en conexión básica con Gemini API');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error(`Detalles: ${errorText}\n`);

      if (response.status === 400) {
        console.error('💡 CAUSA PROBABLE: API Key inválida o con formato incorrecto');
        console.error('   - Verifica que copiaste la key completa sin espacios');
        console.error('   - Genera una nueva key en: https://aistudio.google.com/apikey\n');
      } else if (response.status === 403) {
        console.error('💡 CAUSA PROBABLE: API Key sin permisos o restricciones activas');
        console.error('   - Verifica las restricciones de API key en Google Cloud Console');
        console.error('   - Asegúrate de que Generative Language API esté habilitada\n');
      } else if (response.status === 429) {
        console.error('💡 CAUSA PROBABLE: Límite de cuota excedido');
        console.error('   - Espera unos minutos y vuelve a intentar');
        console.error('   - Verifica tu cuota en: https://aistudio.google.com/\n');
      }

      return false;
    }

    const data = await response.json();
    console.log('✅ Conexión básica exitosa');
    console.log(`📊 Modelos disponibles: ${data.models?.length || 0}\n`);

    return data.models || [];
  } catch (error) {
    console.error('❌ ERROR de red:', error.message);
    console.error('💡 Verifica tu conexión a Internet\n');
    return false;
  }
}

// Paso 3: Probar modelos específicos
async function testModel(modelName) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Say "Hello" if you can hear me.' }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Paso 4: Verificar soporte de Gemini Live API
async function testLiveAPISupport() {
  console.log('\n' + '='.repeat(60));
  console.log('🎤 VERIFICANDO SOPORTE DE GEMINI LIVE API\n');

  try {
    // Intentar importar el SDK de Gemini
    const { GoogleGenAI } = await import('@google/genai');
    console.log('✅ SDK de @google/genai instalado correctamente');

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log('✅ Cliente de GoogleGenAI inicializado');

    console.log('\n⚠️  NOTA: Para probar completamente Live API necesitas:');
    console.log('   1. Navegador con soporte de micrófono');
    console.log('   2. Conexión HTTPS (o localhost)');
    console.log('   3. Permisos de micrófono habilitados\n');

    return true;
  } catch (error) {
    console.error('❌ ERROR importando SDK:', error.message);
    console.error('\n💡 SOLUCIÓN:');
    console.error('   npm install @google/genai\n');
    return false;
  }
}

// Ejecutar todas las pruebas
async function runDiagnostics() {
  // Test 1: Conexión básica
  const models = await testBasicConnection();

  if (!models) {
    console.log('\n❌ Diagnóstico detenido debido a error de conexión\n');
    process.exit(1);
  }

  // Test 2: Listar modelos disponibles
  if (models.length > 0) {
    console.log('📋 MODELOS DISPONIBLES EN TU API KEY:\n');
    models
      .filter(m => m.name.includes('gemini'))
      .slice(0, 10)
      .forEach(model => {
        console.log(`   - ${model.name.replace('models/', '')}`);
      });
    console.log('');
  }

  // Test 3: Probar modelos específicos
  console.log('='.repeat(60));
  console.log('🧪 PROBANDO MODELOS PARA CABO HEALTH\n');

  for (const modelName of MODELS_TO_TEST) {
    process.stdout.write(`⏳ Probando ${modelName}... `);
    const result = await testModel(modelName);

    if (result.success) {
      console.log('✅ FUNCIONA');
      console.log(`   Respuesta: "${result.data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK'}"\n`);
    } else {
      console.log('❌ NO DISPONIBLE');
      console.log(`   Error: ${result.error}\n`);
    }
  }

  // Test 4: Live API
  await testLiveAPISupport();

  // Resumen final
  console.log('='.repeat(60));
  console.log('📊 RESUMEN DEL DIAGNÓSTICO\n');
  console.log('Para usar Cabo Health Nova necesitas:');
  console.log('  ✅ API Key válida (verificar arriba)');
  console.log('  ✅ Acceso a Gemini 2.5 Flash o superior');
  console.log('  ✅ SDK @google/genai instalado');
  console.log('  ⚠️  Gemini Live API con native audio (preview)\n');
  console.log('🔗 RECURSOS ÚTILES:');
  console.log('  • Obtener API Key: https://aistudio.google.com/apikey');
  console.log('  • Documentación Live API: https://ai.google.dev/gemini-api/docs/live');
  console.log('  • Modelos disponibles: https://ai.google.dev/gemini-api/docs/models\n');
  console.log('='.repeat(60) + '\n');
}

// Ejecutar
runDiagnostics().catch(error => {
  console.error('\n❌ ERROR FATAL:', error);
  process.exit(1);
});
