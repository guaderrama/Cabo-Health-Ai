import { chromium } from 'playwright';

async function testApp() {
  console.log('🚀 Iniciando prueba con Playwright...\n');

  const browser = await chromium.launch({
    headless: false, // Ver navegador
    args: ['--ignore-certificate-errors'] // Ignorar cert SSL self-signed
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Capturar errores de consola
  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`❌ Console Error: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  // Capturar excepciones no manejadas
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log(`💥 Page Error: ${error.message}`);
  });

  try {
    console.log('📡 Navegando a https://localhost:9001/ (production build)...\n');

    // Intentar cargar la página
    await page.goto('https://localhost:9001/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ Página cargada\n');

    // Esperar un poco para que React se monte
    await page.waitForTimeout(3000);

    // Tomar screenshot
    await page.screenshot({
      path: 'test-app-screenshot.png',
      fullPage: true
    });
    console.log('📸 Screenshot guardado: test-app-screenshot.png\n');

    // Verificar si hay contenido visible (no pantalla blanca)
    const bodyText = await page.textContent('body');
    const hasContent = bodyText && bodyText.trim().length > 100;

    console.log(`📝 Longitud del contenido del body: ${bodyText?.length || 0} caracteres`);
    console.log(`${hasContent ? '✅' : '❌'} ${hasContent ? 'Página tiene contenido' : 'Página parece vacía (pantalla blanca)'}\n`);

    // Buscar elementos principales de la app
    const appElements = {
      'Header/Title': await page.locator('h1, h2, header').count(),
      'Buttons': await page.locator('button').count(),
      'Forms': await page.locator('form, input').count(),
      'Root div': await page.locator('#root').count()
    };

    console.log('🔍 Elementos encontrados:');
    Object.entries(appElements).forEach(([name, count]) => {
      console.log(`  ${count > 0 ? '✅' : '❌'} ${name}: ${count}`);
    });
    console.log('');

    // Resumen de errores
    console.log('📊 RESUMEN:');
    console.log(`  Errores de consola: ${consoleErrors.length}`);
    console.log(`  Errores de página: ${pageErrors.length}`);
    console.log(`  Warnings: ${consoleWarnings.length}`);
    console.log('');

    if (consoleErrors.length === 0 && pageErrors.length === 0 && hasContent) {
      console.log('🎉 ¡ÉXITO! La aplicación cargó correctamente sin errores críticos.\n');
      return true;
    } else {
      console.log('⚠️  PROBLEMAS DETECTADOS:\n');
      if (!hasContent) {
        console.log('  ❌ Pantalla blanca - sin contenido visible');
      }
      if (consoleErrors.length > 0) {
        console.log(`  ❌ ${consoleErrors.length} errores de consola`);
      }
      if (pageErrors.length > 0) {
        console.log(`  ❌ ${pageErrors.length} errores de página no manejados`);
        pageErrors.forEach(err => console.log(`     - ${err}`));
      }
      console.log('');
      return false;
    }

  } catch (error) {
    console.log(`\n💥 ERROR AL CARGAR LA PÁGINA:\n${error.message}\n`);
    return false;
  } finally {
    // Dejar navegador abierto por 10 segundos para inspección manual
    console.log('⏳ Dejando navegador abierto 10 segundos para inspección manual...\n');
    await page.waitForTimeout(10000);

    await browser.close();
  }
}

testApp().then(success => {
  process.exit(success ? 0 : 1);
});
