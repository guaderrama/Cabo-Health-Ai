import { chromium } from 'playwright';

async function testApplication() {
  console.log('\n=== PRUEBA FINAL DE VERIFICACIÓN ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Interceptar requests para verificar API keys
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('supabase.co') || request.url().includes('googleapis.com')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });

  // Interceptar responses
  const responses = [];
  page.on('response', async response => {
    if (response.url().includes('supabase.co') || response.url().includes('googleapis.com')) {
      const status = response.status();
      let body = null;
      try {
        body = await response.text();
      } catch (e) {
        body = 'Could not read body';
      }
      responses.push({
        url: response.url(),
        status: status,
        body: body
      });
    }
  });

  try {
    console.log('1. Navegando a http://localhost:9000...');
    await page.goto('http://localhost:9000', { waitUntil: 'networkidle' });

    console.log('2. Tomando screenshot de la página inicial...');
    await page.screenshot({ path: 'screenshot-inicio.png', fullPage: true });

    // Generar email único
    const timestamp = Date.now();
    const testEmail = `test-final-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log(`3. Llenando formulario de registro con email: ${testEmail}...`);

    // Esperar a que el formulario esté visible
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    // Llenar formulario
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    console.log('4. Tomando screenshot antes de enviar...');
    await page.screenshot({ path: 'screenshot-formulario-lleno.png', fullPage: true });

    console.log('5. Haciendo clic en el botón de registro...');
    await page.click('button[type="submit"]');

    // Esperar respuesta
    await page.waitForTimeout(3000);

    console.log('6. Tomando screenshot después de enviar...');
    await page.screenshot({ path: 'screenshot-resultado.png', fullPage: true });

    // Verificar mensajes de error o éxito en la página
    const pageText = await page.textContent('body');

    console.log('\n=== RESULTADOS ===\n');

    // Analizar responses
    console.log('Responses capturados:');
    responses.forEach((resp, index) => {
      console.log(`\nResponse ${index + 1}:`);
      console.log(`  URL: ${resp.url}`);
      console.log(`  Status: ${resp.status}`);
      if (resp.status === 401) {
        console.log('  ❌ ERROR: 401 Unauthorized - API key inválida');
      } else if (resp.status === 200) {
        console.log('  ✅ SUCCESS: 200 OK');
      } else if (resp.status === 403) {
        console.log('  ❌ ERROR: 403 Forbidden');
      }
      console.log(`  Body: ${resp.body.substring(0, 200)}...`);
    });

    // Verificar texto en la página
    if (pageText.includes('Invalid API key') || pageText.includes('API key inválida')) {
      console.log('\n❌ ERROR: La página muestra "Invalid API key"');
    } else if (pageText.includes('exitoso') || pageText.includes('success')) {
      console.log('\n✅ SUCCESS: La página muestra mensaje de éxito');
    } else if (pageText.includes('email') && pageText.includes('confirmación')) {
      console.log('\n✅ SUCCESS: La página solicita confirmación de email');
    }

    console.log('\n=== VERIFICACIÓN DE API KEYS ===\n');

    // Verificar API keys en el código JavaScript
    const scriptContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => s.src).filter(src => src.includes('index-'));
    });

    console.log('Scripts cargados:', scriptContent);

    // Esperar 5 segundos para que el usuario vea el resultado
    console.log('\nEsperando 5 segundos para observar el resultado...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERROR durante la prueba:', error.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testApplication().catch(console.error);
