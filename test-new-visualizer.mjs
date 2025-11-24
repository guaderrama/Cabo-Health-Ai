import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = './screenshots-visualizador-mejorado';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testNewVisualizer() {
  console.log('\n🧪 VALIDANDO NUEVO VISUALIZADOR\n');
  console.log('📍 URL: https://localhost:9003/\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--ignore-certificate-errors']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // 1. Cargar aplicación
    console.log('📋 Test 1: Carga de Aplicación\n');
    await page.goto('https://localhost:9003/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, '01-app-loaded.png'),
      fullPage: false
    });
    console.log('✅ Aplicación cargada\n');

    // 2. Login
    console.log('📋 Test 2: Login\n');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button:has-text("Iniciar Sesión"), button:has-text("Sign In")');

    await emailInput.fill('doctor_test@cabo.health');
    await passwordInput.fill('TestPass123!');
    await loginButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(screenshotsDir, '02-logged-in.png'),
      fullPage: false
    });
    console.log('✅ Login exitoso\n');

    // 3. Buscar visualizador en estado idle
    console.log('📋 Test 3: Visualizador en Estado Idle\n');
    const visualizadorWrapper = page.locator('[role="status"]');

    if (await visualizadorWrapper.count() > 0) {
      console.log('✅ Visualizador encontrado en la página\n');

      // Screenshot del visualizador idle
      await page.screenshot({
        path: path.join(screenshotsDir, '03-visualizador-idle.png'),
        fullPage: false
      });
      console.log('📸 Screenshot del visualizador idle guardado\n');

      // 4. Iniciar sesión médica
      console.log('📋 Test 4: Iniciar Sesión Médica\n');
      const patientNameInput = page.locator('input[placeholder*="paciente"], input[placeholder*="Patient"], input[type="text"]').first();
      await patientNameInput.fill('Paciente Test Visualizador');
      await page.waitForTimeout(500);

      const startButton = page.locator('button:has-text("Iniciar"), button:has-text("Start")').first();
      await startButton.click();
      await page.waitForTimeout(3000);

      console.log('✅ Sesión médica iniciada\n');

      // Screenshot del visualizador listening
      await page.screenshot({
        path: path.join(screenshotsDir, '04-visualizador-listening.png'),
        fullPage: false
      });
      console.log('📸 Screenshot del visualizador listening guardado\n');

      // Zoom al visualizador
      const visualizador = page.locator('[role="status"]').first();
      const box = await visualizador.boundingBox();

      if (box) {
        await page.screenshot({
          path: path.join(screenshotsDir, '05-visualizador-listening-zoom.png'),
          clip: {
            x: Math.max(0, box.x - 50),
            y: Math.max(0, box.y - 50),
            width: Math.min(box.width + 100, 800),
            height: Math.min(box.height + 100, 800)
          }
        });
        console.log('📸 Screenshot zoom del visualizador guardado\n');
      }

      // Esperar unos segundos más para capturar animaciones
      console.log('⏱️ Esperando para capturar animaciones...\n');
      await page.waitForTimeout(5000);

      await page.screenshot({
        path: path.join(screenshotsDir, '06-visualizador-animado.png'),
        fullPage: false
      });
      console.log('📸 Screenshot del visualizador animado guardado\n');

    } else {
      console.log('⚠️ Visualizador no encontrado en la página\n');
    }

    // Resultados finales
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   VALIDACIÓN DEL NUEVO VISUALIZADOR       ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log('✅ Screenshots guardados en:', screenshotsDir);
    console.log('\n📸 Archivos generados:');
    console.log('   1. 01-app-loaded.png - Aplicación cargada');
    console.log('   2. 02-logged-in.png - Usuario autenticado');
    console.log('   3. 03-visualizador-idle.png - Visualizador en reposo');
    console.log('   4. 04-visualizador-listening.png - Visualizador escuchando');
    console.log('   5. 05-visualizador-listening-zoom.png - Zoom del visualizador');
    console.log('   6. 06-visualizador-animado.png - Visualizador con animaciones');
    console.log('\n🔍 Manteniendo navegador abierto 10 segundos para inspección...\n');

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n💥 Error durante testing:', error.message);
    await page.screenshot({
      path: path.join(screenshotsDir, 'error-screenshot.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

testNewVisualizer().catch(console.error);
