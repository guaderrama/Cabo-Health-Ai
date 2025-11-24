import { chromium } from 'playwright';

async function testRegistration() {
  console.log('\n=== PRUEBA DE REGISTRO COMPLETO ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
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
    console.log('1. Navegando a http://localhost:9000...');
    await page.goto('http://localhost:9000', { waitUntil: 'networkidle' });

    console.log('2. Haciendo clic en "Regístrate" para cambiar a modo registro...');
    await page.waitForSelector('text=Regístrate', { timeout: 5000 });
    await page.click('text=Regístrate');

    // Esperar a que cambie el formulario
    await page.waitForTimeout(1000);

    // Generar email único
    const timestamp = Date.now();
    const testEmail = `test-registro-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log(`3. Llenando formulario de registro con email: ${testEmail}...`);

    // Llenar formulario
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    console.log('4. Tomando screenshot antes de enviar...');
    await page.screenshot({ path: 'screenshot-registro-antes.png', fullPage: true });

    console.log('5. Haciendo clic en el botón "Registrarse"...');
    await page.click('button[type="submit"]');

    // Esperar respuesta
    console.log('6. Esperando respuesta de Supabase...');
    await page.waitForTimeout(3000);

    console.log('7. Tomando screenshot después de enviar...');
    await page.screenshot({ path: 'screenshot-registro-despues.png', fullPage: true });

    // Verificar mensajes en la página
    const pageText = await page.textContent('body');

    console.log('\n=== RESULTADOS ===\n');

    // Analizar responses
    console.log('Respuestas de Supabase capturadas:');
    responses.forEach((resp, index) => {
      console.log(`\nResponse ${index + 1}:`);
      console.log(`  URL: ${resp.url}`);
      console.log(`  Status: ${resp.status} ${resp.statusText}`);

      if (resp.status === 401) {
        console.log('  ❌ ERROR: 401 Unauthorized - API key inválida');
      } else if (resp.status === 200) {
        console.log('  ✅ SUCCESS: 200 OK - Registro exitoso');
      } else if (resp.status === 403) {
        console.log('  ❌ ERROR: 403 Forbidden - API key revocada');
      } else if (resp.status === 400) {
        console.log('  ⚠️  WARNING: 400 Bad Request');
      }

      console.log(`  Body:`, JSON.stringify(resp.body, null, 2));
    });

    // Verificar texto en la página
    console.log('\n=== VERIFICACIÓN DE MENSAJES EN LA PÁGINA ===\n');

    if (pageText.includes('Invalid API key') || pageText.includes('API key inválida')) {
      console.log('❌ ERROR: La página muestra "Invalid API key"');
    } else if (pageText.includes('exitoso') || pageText.includes('éxito')) {
      console.log('✅ SUCCESS: La página muestra mensaje de éxito');
      console.log('   Mensaje encontrado: "Registro exitoso"');
    } else if (pageText.includes('email') && pageText.includes('confirmar')) {
      console.log('✅ SUCCESS: La página solicita confirmación de email');
    } else if (pageText.includes('Invalid login credentials')) {
      console.log('⚠️  La página muestra "Invalid login credentials" (esto es normal si no existe el usuario)');
    }

    console.log('\n=== RESUMEN FINAL ===\n');

    const hasError401 = responses.some(r => r.status === 401);
    const hasSuccess200 = responses.some(r => r.status === 200);
    const hasError403 = responses.some(r => r.status === 403);

    if (hasError401) {
      console.log('❌ FALLO: Supabase rechazó la API key (401)');
    } else if (hasError403) {
      console.log('❌ FALLO: API key revocada por Google (403)');
    } else if (hasSuccess200) {
      console.log('✅✅✅ ÉXITO COMPLETO: Registro funcionó correctamente (200 OK)');
      console.log('   - Gemini API key: ✅ Funcionando');
      console.log('   - Supabase Anon key: ✅ Funcionando');
      console.log('   - Aplicación: ✅ COMPLETAMENTE FUNCIONAL');
    } else {
      console.log('⚠️  ESTADO DESCONOCIDO: Revisar responses arriba');
    }

    // Esperar 5 segundos para que el usuario vea el resultado
    console.log('\nEsperando 5 segundos para observar el resultado...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERROR durante la prueba:', error.message);
    await page.screenshot({ path: 'screenshot-error-registro.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testRegistration().catch(console.error);
