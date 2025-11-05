// Script para probar si la API key de Gemini es válida
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

async function testApiKey() {
  console.log('🔍 Probando API key de Gemini desde .env...\n');
  console.log(`API Key: ${API_KEY.substring(0, 20)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log('');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Di hola'
            }]
          }]
        })
      }
    );

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ ¡API KEY VÁLIDA!');
      console.log('');
      console.log('Respuesta recibida:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('🎉 Tu API key funciona correctamente.');
      console.log('El problema debe estar en MiniMax Space.');
    } else {
      console.log('❌ API KEY INVÁLIDA');
      console.log('');
      console.log('Error recibido:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      
      if (response.status === 401 || response.status === 403) {
        console.log('🚨 Esta API key NO es válida.');
        console.log('');
        console.log('👉 Solución:');
        console.log('1. Ve a: https://aistudio.google.com/apikey');
        console.log('2. Crea una NUEVA API key');
        console.log('3. Cópiala completa');
        console.log('4. Actualiza en .env: VITE_GEMINI_API_KEY=nueva_key');
        console.log('5. Actualiza en MiniMax Space');
      } else if (response.status === 400) {
        console.log('⚠️ Error de formato, pero la key puede ser válida');
        console.log('El problema es con la request, no con la API key');
      }
    }
  } catch (error) {
    console.error('❌ Error al probar API key:', error.message);
  }
}

testApiKey();
