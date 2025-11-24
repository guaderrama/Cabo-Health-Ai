import { chromium } from 'playwright';

async function testDevServer() {
  console.log('\n=== PRUEBA DEV SERVER - CABO HEALTH NOVA ===\n');

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

  // Capturar solicitudes y respuestas de autenticación
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

  // Capturar errores de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    console.log('1. Abriendo https://localhost:3000 (Dev Server)...');
    await page.goto('https://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    console.log('2. Esperando carga completa...');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-dev-01-inicio.png', fullPage: true });

    // Verificar HTTPS
    const protocol = await page.evaluate(() => window.location.protocol);
    console.log('\n✓ Protocolo:', protocol === 'https:' ? '✅ HTTPS' : '❌ NO HTTPS');

    // Verificar micrófono
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

    // Verificar si hay errores de "Invalid API key" en la página
    const pageText = await page.textContent('body').catch(() => '');
    if (pageText.includes('Invalid API key')) {
      console.log('\n❌ ERROR: "Invalid API key" aparece en la página');
    } else {
      console.log('\n✅ No hay mensaje de "Invalid API key" en la página');
    }

    // Buscar formulario
    console.log('\n3. Buscando formulario de autenticación...');

    const hasEmailInput = await page.isVisible('input[type="email"]').catch(() => false);
    const hasPasswordInput = await page.isVisible('input[type="password"]').catch(() => false);

    if (hasEmailInput && hasPasswordInput) {
      console.log('✅ Formulario encontrado');

      // Verificar si está en modo login y cambiar a registro
      console.log('\n4. Cambiando a modo registro...');
      const registerLink = page.locator('button:has-text("Regístrate")');
      if (await registerLink.isVisible().catch(() => false)) {
        await registerLink.click();
        await page.waitForTimeout(500);
        console.log('✅ Cambiado a modo registro');
      } else {
        console.log('⚠️  Ya está en modo registro o no se encontró el enlace');
      }

      // Generar credenciales únicas
      const timestamp = Date.now();
      const testEmail = `test-${timestamp}@cabosaludnova.com`;
      const testPassword = 'TestPassword123!';

      console.log('\n5. Llenando formulario...');
      console.log('Email:', testEmail);

      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);

      await page.screenshot({ path: 'test-dev-02-formulario.png', fullPage: true });

      // Intentar registro
      console.log('\n7. Buscando botón de registro...');

      // Intentar diferentes selectores
      const registerSelectors = [
        'button:has-text("Registrarse")',
        'button:has-text("Sign up")',
        'button:has-text("Register")',
        'button[type="submit"]'
      ];

      let buttonFound = false;
      for (const selector of registerSelectors) {
        const button = page.locator(selector).first();
        if (await button.isVisible().catch(() => false)) {
          console.log(`✅ Botón encontrado: ${selector}`);
          console.log('8. Haciendo clic...');
          await button.click();
          buttonFound = true;
          break;
        }
      }

      if (!buttonFound) {
        console.log('❌ No se encontró ningún botón de registro');
        // Tomar screenshot para ver qué botones hay
        await page.screenshot({ path: 'test-dev-03-no-button.png', fullPage: true });
      } else {
        console.log('9. Esperando respuesta...');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-dev-03-after-submit.png', fullPage: true });
      }

    } else {
      console.log('❌ No se encontró formulario (email:', hasEmailInput, 'password:', hasPasswordInput, ')');
      await page.screenshot({ path: 'test-dev-02-no-form.png', fullPage: true });
    }

    // Mostrar respuestas de autenticación
    console.log('\n=== RESPUESTAS DE SUPABASE ===\n');
    if (authRequests.length > 0) {
      authRequests.forEach((req, i) => {
        console.log(`Respuesta ${i + 1}:`);
        console.log('  URL:', req.url);
        console.log('  Status:', req.status, req.statusText);

        if (req.status === 200) {
          console.log('  ✅✅✅ ÉXITO - Autenticación funcionando');
        } else if (req.status === 401) {
          console.log('  ❌ ERROR 401 - API Key inválida');
        } else if (req.status === 400) {
          console.log('  ⚠️  ERROR 400 - Revisar datos');
        }

        if (req.body) {
          console.log('  Body:', req.body);
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No se capturaron solicitudes a Supabase');
    }

    // Mostrar errores de consola
    if (consoleErrors.length > 0) {
      console.log('\n=== ERRORES DE CONSOLA ===\n');
      consoleErrors.forEach(err => console.log('  ❌', err));
    }

    // Resumen final
    console.log('\n=== RESUMEN FINAL ===\n');
    console.log('HTTPS:', protocol === 'https:' ? '✅' : '❌');
    console.log('Micrófono:', micTest.success ? '✅' : '❌');

    const hasSuccess = authRequests.some(r => r.status === 200);
    const has401 = authRequests.some(r => r.status === 401);

    if (hasSuccess) {
      console.log('Autenticación: ✅ FUNCIONANDO');
      console.log('\n🎉🎉🎉 TODO FUNCIONANDO CORRECTAMENTE 🎉🎉🎉');
      console.log('\nLa aplicación está lista para usar localmente en:');
      console.log('  https://localhost:3000\n');
    } else if (has401) {
      console.log('Autenticación: ❌ Error 401');
    } else {
      console.log('Autenticación: ⚠️  No probada');
    }

    console.log('\n10. Esperando 5 segundos antes de cerrar...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'test-dev-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testDevServer().catch(console.error);
