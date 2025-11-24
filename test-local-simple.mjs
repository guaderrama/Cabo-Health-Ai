import { chromium } from 'playwright';
import { readFileSync } from 'fs';

async function testLocalSimple() {
  console.log('\n=== PRUEBA LOCAL - CABO HEALTH NOVA ===\n');

  // Primero verificar qué hay en el JavaScript compilado
  console.log('1. Verificando JavaScript compilado...\n');

  const distIndexHtml = readFileSync('c:\\Users\\admin\\Dropbox\\Ai\\cabo-health-nova\\dist\\index.html', 'utf-8');
  const jsFileMatch = distIndexHtml.match(/src="([^"]+\.js)"/);

  if (jsFileMatch) {
    const jsFile = jsFileMatch[1].replace(/^\//, '');
    const jsPath = `c:\\Users\\admin\\Dropbox\\Ai\\cabo-health-nova\\dist\\${jsFile}`;
    console.log('Archivo JS:', jsPath);

    const jsContent = readFileSync(jsPath, 'utf-8');

    // Verificar Gemini key
    if (jsContent.includes('AIzaSyAF3QzERye3p8dEneGKzToCCv-nxD81XTA')) {
      console.log('✅ Gemini Key CORRECTA encontrada en JS compilado');
    } else if (jsContent.includes('AIzaSy')) {
      const match = jsContent.match(/AIzaSy[a-zA-Z0-9_-]{33}/);
      console.log('❌ Gemini Key INCORRECTA:', match ? match[0] : 'No encontrada');
    } else {
      console.log('❌ NO se encontró ninguna Gemini Key en JS compilado');
    }

    // Verificar Supabase key (buscar el iat: 1762042642)
    if (jsContent.includes('1762042642')) {
      console.log('✅ Supabase Key CORRECTA encontrada en JS compilado (iat: 1762042642)');
    } else if (jsContent.includes('1722042642')) {
      console.log('❌ Supabase Key INCORRECTA encontrada (iat: 1722042642 - KEY ANTIGUA)');
    } else {
      console.log('❌ NO se encontró timestamp de Supabase Key en JS compilado');
    }
  }

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Capturar solicitudes y respuestas
  const authRequests = [];
  page.on('response', async response => {
    if (response.url().includes('supabase.co/auth')) {
      try {
        const body = await response.text();
        authRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          body: body.substring(0, 500)
        });
      } catch (e) {
        authRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    }
  });

  try {
    console.log('\n2. Abriendo aplicación en https://localhost:3000...');
    await page.goto('https://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    console.log('3. Esperando carga completa...');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-simple-01-inicio.png', fullPage: true });

    // Verificar HTTPS y micrófono
    const protocol = await page.evaluate(() => window.location.protocol);
    console.log('\n✓ Protocolo:', protocol === 'https:' ? '✅ HTTPS' : '❌ NO HTTPS');

    const micTest = await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    console.log('✓ Micrófono:', micTest.success ? '✅ Accesible' : `❌ ${micTest.error}`);

    // Buscar formulario de registro
    console.log('\n4. Buscando formulario de registro/login...');

    const hasEmailInput = await page.isVisible('input[type="email"]').catch(() => false);
    const hasPasswordInput = await page.isVisible('input[type="password"]').catch(() => false);

    if (hasEmailInput && hasPasswordInput) {
      console.log('✅ Formulario encontrado');

      // Generar credenciales únicas
      const timestamp = Date.now();
      const testEmail = `test-${timestamp}@cabosaludnova.com`;
      const testPassword = 'TestPassword123!';

      console.log('\n5. Intentando registro...');
      console.log('Email:', testEmail);

      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);

      await page.screenshot({ path: 'test-simple-02-formulario.png', fullPage: true });

      // Buscar botón de registro
      const registerButton = await page.locator('button:has-text("Registrarse")').first();
      if (await registerButton.isVisible()) {
        console.log('6. Haciendo clic en "Registrarse"...');
        await registerButton.click();

        console.log('7. Esperando respuesta de Supabase...');
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-simple-03-despues-registro.png', fullPage: true });
      } else {
        console.log('❌ No se encontró botón de Registrarse');
      }

    } else {
      console.log('❌ No se encontró formulario de email/password');
    }

    // Mostrar respuestas de autenticación
    console.log('\n=== RESPUESTAS DE SUPABASE AUTH ===\n');
    if (authRequests.length > 0) {
      authRequests.forEach((req, i) => {
        console.log(`Respuesta ${i + 1}:`);
        console.log('  URL:', req.url);
        console.log('  Status:', req.status, req.statusText);

        if (req.status === 200) {
          console.log('  ✅ ÉXITO - Autenticación funcionando correctamente');
        } else if (req.status === 401) {
          console.log('  ❌ ERROR 401 - API Key inválida');
        } else if (req.status === 400) {
          console.log('  ⚠️  ERROR 400 - Posible problema con datos de registro');
        }

        if (req.body) {
          console.log('  Body:', req.body);
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No se capturaron solicitudes a Supabase Auth');
    }

    // Resumen
    console.log('\n=== RESUMEN ===\n');
    console.log('HTTPS:', protocol === 'https:' ? '✅' : '❌');
    console.log('Micrófono:', micTest.success ? '✅' : '❌');

    const hasSuccess = authRequests.some(r => r.status === 200);
    const has401 = authRequests.some(r => r.status === 401);

    console.log('Autenticación:', hasSuccess ? '✅ Funcionando' : (has401 ? '❌ Error 401' : '⚠️  No probada'));

    if (hasSuccess) {
      console.log('\n✅✅✅ TODO FUNCIONANDO CORRECTAMENTE ✅✅✅');
    } else if (has401) {
      console.log('\n❌❌❌ ERROR: API KEY INVÁLIDA ❌❌❌');
    }

    console.log('\n8. Esperando 5 segundos...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'test-simple-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testLocalSimple().catch(console.error);
