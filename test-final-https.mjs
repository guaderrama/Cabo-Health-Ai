import { chromium } from 'playwright';

async function testFinalHTTPS() {
  console.log('\n=== PRUEBA FINAL CON HTTPS ===\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Interceptar responses
  const responses = [];
  page.on('response', async response => {
    if (response.url().includes('supabase.co')) {
      const status = response.status();
      let body = null;
      try {
        body = await response.json();
      } catch (e) {
        try {
          body = await response.text();
        } catch (e2) {
          body = 'Could not read body';
        }
      }
      responses.push({
        url: response.url(),
        status: status,
        statusText: response.statusText(),
        body: body
      });
    }
  });

  try {
    console.log('1. Navegando a https://localhost:3000...');
    await page.goto('https://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    console.log('2. Esperando a que cargue la aplicación...');
    await page.waitForTimeout(3000);

    console.log('3. Tomando screenshot inicial...');
    await page.screenshot({ path: 'test-final-inicio.png', fullPage: true });

    // Verificar si hay errores
    const pageText = await page.textContent('body');

    console.log('\n=== VERIFICACIÓN DE ERRORES ===\n');

    if (pageText.includes('Invalid API key')) {
      console.log('❌ ERROR: Aparece "Invalid API key"');
      await page.screenshot({ path: 'test-final-error-api-key.png', fullPage: true });
      await browser.close();
      return;
    } else {
      console.log('✅ No hay error de "Invalid API key"');
    }

    // Verificar HTTPS
    const protocol = await page.evaluate(() => window.location.protocol);
    console.log('Protocolo:', protocol);
    if (protocol === 'https:') {
      console.log('✅ Usando HTTPS correctamente');
    } else {
      console.log('❌ ERROR: No está usando HTTPS');
      await browser.close();
      return;
    }

    // Verificar micrófono
    console.log('\n4. Probando acceso al micrófono...');
    const micTest = await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return { success: true, message: 'Micrófono accesible' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (micTest.success) {
      console.log('✅ Micrófono: ACCESIBLE');
    } else {
      console.log('❌ Micrófono: ERROR -', micTest.error);
    }

    // Probar registro
    console.log('\n5. Haciendo clic en "Regístrate"...');
    await page.click('text=Regístrate');
    await page.waitForTimeout(1000);

    const timestamp = Date.now();
    const testEmail = `test-final-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log(`6. Registrando usuario: ${testEmail}...`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    console.log('7. Enviando formulario...');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    console.log('8. Tomando screenshot final...');
    await page.screenshot({ path: 'test-final-resultado.png', fullPage: true });

    console.log('\n=== RESULTADOS DE SUPABASE ===\n');

    const supabaseResponses = responses.filter(r => r.url.includes('supabase.co'));

    if (supabaseResponses.length === 0) {
      console.log('⚠️  No se detectaron requests a Supabase');
    }

    let hasSuccess = false;
    let hasError = false;

    supabaseResponses.forEach((resp, index) => {
      console.log(`\nResponse ${index + 1}:`);
      console.log(`  URL: ${resp.url}`);
      console.log(`  Status: ${resp.status} ${resp.statusText}`);

      if (resp.status === 401) {
        console.log('  ❌ ERROR: 401 - API key inválida');
        hasError = true;
      } else if (resp.status === 200) {
        console.log('  ✅ SUCCESS: 200 OK');
        hasSuccess = true;
      } else if (resp.status === 400) {
        console.log('  ⚠️  400 Bad Request');
      }
    });

    // Verificar texto en la página
    const finalPageText = await page.textContent('body');

    console.log('\n=== RESUMEN FINAL ===\n');

    const checks = {
      https: protocol === 'https:',
      noApiError: !finalPageText.includes('Invalid API key'),
      microphone: micTest.success,
      supabaseWorks: hasSuccess && !hasError
    };

    console.log('✅ HTTPS:', checks.https ? 'SÍ' : 'NO');
    console.log('✅ Sin error de API key:', checks.noApiError ? 'SÍ' : 'NO');
    console.log('✅ Micrófono funciona:', checks.microphone ? 'SÍ' : 'NO');
    console.log('✅ Supabase funciona:', checks.supabaseWorks ? 'SÍ' : 'NO');

    if (checks.https && checks.noApiError && checks.microphone && checks.supabaseWorks) {
      console.log('\n🎉🎉🎉 ÉXITO COMPLETO: TODO FUNCIONA CORRECTAMENTE 🎉🎉🎉\n');
    } else {
      console.log('\n❌ FALLÓ: Algunos componentes no funcionan correctamente\n');
    }

    console.log('9. Esperando 5 segundos...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERROR durante la prueba:', error.message);
    await page.screenshot({ path: 'test-final-crash.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testFinalHTTPS().catch(console.error);
