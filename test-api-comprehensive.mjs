// Script completo para probar API key de Gemini con múltiples pruebas
import { readFileSync } from 'fs';

// Leer la API key desde el archivo .env
function getApiKeyFromEnv() {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    throw new Error('No se encontró VITE_GEMINI_API_KEY en .env');
  } catch (error) {
    console.error('❌ Error leyendo .env:', error.message);
    process.exit(1);
  }
}

const API_KEY = getApiKeyFromEnv();

console.log('═══════════════════════════════════════════════════════════');
console.log('🔬 PRUEBAS COMPLETAS DE API KEY DE GEMINI');
console.log('═══════════════════════════════════════════════════════════\n');
console.log(`📋 API Key leída desde .env:`);
console.log(`   Inicio: ${API_KEY.substring(0, 15)}...`);
console.log(`   Final:  ...${API_KEY.substring(API_KEY.length - 10)}`);
console.log(`   Longitud: ${API_KEY.length} caracteres\n`);
console.log('═══════════════════════════════════════════════════════════\n');

// Prueba 1: Listar modelos disponibles
async function test1_ListModels() {
  console.log('📋 PRUEBA 1: Listar modelos disponibles');
  console.log('─────────────────────────────────────────');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS - Modelos disponibles:');
      if (data.models && data.models.length > 0) {
        data.models.slice(0, 5).forEach(model => {
          console.log(`   • ${model.name}`);
        });
        console.log(`   ... y ${data.models.length - 5} más\n`);
      }
      return true;
    } else {
      console.log('❌ FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error?.message || 'Unknown error'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED - Error de conexión');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

// Prueba 2: Generar contenido con gemini-2.0-flash-exp
async function test2_GenerateContent() {
  console.log('💬 PRUEBA 2: Generar contenido (gemini-2.0-flash-exp)');
  console.log('─────────────────────────────────────────');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Di "API funcionando correctamente"' }]
          }]
        })
      }
    );

    const data = await response.json();
    
    if (response.ok && data.candidates && data.candidates[0]) {
      console.log('✅ SUCCESS - Respuesta recibida:');
      const text = data.candidates[0].content?.parts[0]?.text || 'Sin texto';
      console.log(`   "${text}"\n`);
      return true;
    } else {
      console.log('❌ FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error?.message || 'Unknown error'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED - Error de conexión');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

// Prueba 3: Generar contenido con gemini-1.5-flash
async function test3_GenerateContentFlash() {
  console.log('⚡ PRUEBA 3: Generar contenido (gemini-1.5-flash)');
  console.log('─────────────────────────────────────────');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: '¿Cuál es la capital de Francia?' }]
          }]
        })
      }
    );

    const data = await response.json();
    
    if (response.ok && data.candidates && data.candidates[0]) {
      console.log('✅ SUCCESS - Respuesta recibida:');
      const text = data.candidates[0].content?.parts[0]?.text || 'Sin texto';
      console.log(`   "${text.substring(0, 100)}..."\n`);
      return true;
    } else {
      console.log('❌ FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error?.message || 'Unknown error'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED - Error de conexión');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

// Prueba 4: Verificar modelo específico usado en tu app
async function test4_LiveAPIModel() {
  console.log('🎤 PRUEBA 4: Modelo usado en tu app (multimodal-live)');
  console.log('─────────────────────────────────────────');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp?key=${API_KEY}`
    );

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS - Modelo disponible:');
      console.log(`   Nombre: ${data.name}`);
      console.log(`   Display: ${data.displayName}`);
      console.log(`   Descripción: ${data.description?.substring(0, 80)}...\n`);
      return true;
    } else {
      console.log('❌ FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error?.message || 'Unknown error'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED - Error de conexión');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  const results = {
    test1: await test1_ListModels(),
    test2: await test2_GenerateContent(),
    test3: await test3_GenerateContentFlash(),
    test4: await test4_LiveAPIModel()
  };
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  
  console.log(`✅ Pruebas exitosas: ${passed}/${total}`);
  console.log(`❌ Pruebas fallidas:  ${total - passed}/${total}\n`);
  
  if (passed === total) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!');
    console.log('');
    console.log('✅ Tu API key está funcionando CORRECTAMENTE.');
    console.log('');
    console.log('📌 Próximos pasos:');
    console.log('   1. Actualiza la API key en MiniMax Space');
    console.log('   2. Settings → Environment Variables');
    console.log('   3. VITE_GEMINI_API_KEY = tu_nueva_key');
    console.log('   4. Guarda y redeploy');
    console.log('');
  } else if (passed > 0) {
    console.log('⚠️  ALGUNAS PRUEBAS FALLARON');
    console.log('');
    console.log('La API key funciona parcialmente.');
    console.log('Puede haber restricciones o límites configurados.');
    console.log('');
  } else {
    console.log('🚨 TODAS LAS PRUEBAS FALLARON');
    console.log('');
    console.log('❌ Esta API key NO es válida o está bloqueada.');
    console.log('');
    console.log('📌 Solución:');
    console.log('   1. Ve a: https://aistudio.google.com/apikey');
    console.log('   2. Crea una NUEVA API key (o verifica la que creaste)');
    console.log('   3. COPIA la key completa desde Google AI Studio');
    console.log('   4. Pégala en .env en la línea:');
    console.log('      VITE_GEMINI_API_KEY=TU_NUEVA_KEY_AQUI');
    console.log('   5. GUARDA el archivo .env');
    console.log('   6. Ejecuta de nuevo: node test-api-comprehensive.mjs');
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════');
}

// Run tests
runAllTests();
