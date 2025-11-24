import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Testing Gemini API Key from .env file...\n');

try {
    // Leer .env
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    // Extraer VITE_GEMINI_API_KEY
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.+)/);
    if (!match) {
        console.error('❌ No se encontró VITE_GEMINI_API_KEY en .env');
        process.exit(1);
    }

    const apiKey = match[1].trim();
    console.log('📋 API Key encontrada:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
    console.log('📏 Longitud:', apiKey.length);
    console.log('🔤 Comienza con "AIza":', apiKey.startsWith('AIza'));

    // Test 1: Listar modelos disponibles
    console.log('\n🔬 Test 1: Listar modelos disponibles...');
    const listResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    console.log('Status:', listResponse.status, listResponse.statusText);

    if (!listResponse.ok) {
        const error = await listResponse.json();
        console.log('\n❌ ERROR al listar modelos:');
        console.log(JSON.stringify(error, null, 2));

        if (error.error?.message?.includes('API key not valid')) {
            console.log('\n⚠️  LA API KEY ES INVÁLIDA');
            console.log('Posibles razones:');
            console.log('1. La key fue revocada o desactivada');
            console.log('2. La key no tiene permisos para Gemini API');
            console.log('3. La key es de un proyecto que fue desactivado');
            console.log('\n📝 Solución:');
            console.log('1. Ve a https://aistudio.google.com/apikey');
            console.log('2. Crea una nueva API key');
            console.log('3. Actualiza .env con la nueva key');
        }

        process.exit(1);
    }

    const models = await listResponse.json();
    console.log('✅ Modelos disponibles:', models.models?.length || 0);

    // Test 2: Generar contenido
    console.log('\n🔬 Test 2: Generar contenido con gemini-2.5-pro...');
    const generateResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: 'Respond with exactly: "API is working correctly"'
                    }]
                }]
            })
        }
    );

    console.log('Status:', generateResponse.status, generateResponse.statusText);

    if (!generateResponse.ok) {
        const error = await generateResponse.json();
        console.log('\n❌ ERROR al generar contenido:');
        console.log(JSON.stringify(error, null, 2));

        if (error.error?.code === 400 && error.error?.message?.includes('models/gemini-2.5-pro')) {
            console.log('\n⚠️  El modelo "gemini-2.5-pro" no está disponible');
            console.log('Probando con "gemini-pro" en su lugar...');

            // Test 3: Intentar con gemini-pro
            const fallbackResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: 'Respond with exactly: "API is working correctly"'
                            }]
                        }]
                    })
                }
            );

            console.log('\nStatus con gemini-pro:', fallbackResponse.status, fallbackResponse.statusText);

            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                console.log('✅ Respuesta:', fallbackData.candidates?.[0]?.content?.parts?.[0]?.text);
                console.log('\n📝 Nota: Considera cambiar el modelo en App.tsx a "gemini-pro"');
            }
        }

        process.exit(1);
    }

    const data = await generateResponse.json();
    console.log('✅ Respuesta:', data.candidates?.[0]?.content?.parts?.[0]?.text);

    console.log('\n✅ ¡TODAS LAS PRUEBAS PASARON!');
    console.log('La API key es válida y funciona correctamente.');

} catch (error) {
    console.error('\n❌ EXCEPCIÓN:', error.message);
    console.error(error.stack);
    process.exit(1);
}
