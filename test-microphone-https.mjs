import { chromium } from 'playwright';

async function testMicrophoneWithHTTPS() {
  console.log('\n=== PRUEBA DE MICRÓFONO CON HTTPS ===\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    ignoreHTTPSErrors: true // Ignorar errores de certificado autofirmado
  });

  const page = await context.newPage();

  try {
    console.log('1. Navegando a https://localhost:3000 (HTTPS)...');
    await page.goto('https://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('2. Esperando a que cargue la aplicación...');
    await page.waitForTimeout(2000);

    console.log('3. Tomando screenshot de la página inicial...');
    await page.screenshot({ path: 'screenshot-https-inicio.png', fullPage: true });

    // Verificar si hay errores de "Invalid API key"
    const pageText = await page.textContent('body');
    if (pageText.includes('Invalid API key')) {
      console.log('❌ ERROR: Todavía aparece "Invalid API key"');
    } else {
      console.log('✅ No hay error de "Invalid API key"');
    }

    // Intentar verificar acceso al micrófono
    console.log('4. Verificando acceso al micrófono...');
    const microphoneTest = await page.evaluate(async () => {
      try {
        // Verificar si estamos en HTTPS
        const isHTTPS = window.location.protocol === 'https:';

        // Intentar acceder al micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Si llegamos aquí, el acceso fue exitoso
        stream.getTracks().forEach(track => track.stop());

        return {
          success: true,
          isHTTPS: isHTTPS,
          protocol: window.location.protocol,
          message: 'Acceso al micrófono concedido exitosamente'
        };
      } catch (error) {
        return {
          success: false,
          isHTTPS: window.location.protocol === 'https:',
          protocol: window.location.protocol,
          error: error.message,
          errorName: error.name
        };
      }
    });

    console.log('\n=== RESULTADOS DE LA PRUEBA ===\n');
    console.log('Protocolo:', microphoneTest.protocol);
    console.log('¿Es HTTPS?:', microphoneTest.isHTTPS ? '✅ Sí' : '❌ No');

    if (microphoneTest.success) {
      console.log('Estado del micrófono: ✅ ACCESO CONCEDIDO');
      console.log('Mensaje:', microphoneTest.message);
      console.log('\n✅✅✅ ÉXITO COMPLETO: El micrófono funciona con HTTPS!');
    } else {
      console.log('Estado del micrófono: ❌ ACCESO DENEGADO');
      console.log('Error:', microphoneTest.error);
      console.log('Tipo de error:', microphoneTest.errorName);
    }

    console.log('\n5. Esperando 5 segundos para observar...');
    await page.waitForTimeout(5000);

    console.log('6. Tomando screenshot final...');
    await page.screenshot({ path: 'screenshot-https-final.png', fullPage: true });

  } catch (error) {
    console.error('\n❌ ERROR durante la prueba:', error.message);
    await page.screenshot({ path: 'screenshot-https-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testMicrophoneWithHTTPS().catch(console.error);
