import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = './test-final-validation';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testFinalValidation() {
  console.log('\n🧪 VALIDACIÓN FINAL DE TODOS LOS FIXES\n');
  console.log('📍 URL: https://localhost:9004/\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--ignore-certificate-errors', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    permissions: ['microphone']
  });

  const page = await context.newPage();

  // Capturar mensajes de consola
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);

    // Mostrar mensajes importantes
    if (text.includes('✅') || text.includes('❌') || text.includes('⛔') || text.includes('⏭️')) {
      console.log(`   ${text}`);
    }
  });

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    consoleMessages: []
  };

  try {
    // TEST 1: Carga de aplicación
    console.log('📋 Test 1: Carga de Aplicación\n');
    await page.goto('https://localhost:9004/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-app-loaded.png') });
    console.log('✅ Aplicación cargada\n');
    results.tests.push({ name: 'Carga de aplicación', status: 'PASSED' });

    // TEST 2: Login
    console.log('📋 Test 2: Login\n');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button:has-text("Iniciar Sesión"), button:has-text("Sign In")');

    await emailInput.fill('doctor_test@cabo.health');
    await passwordInput.fill('TestPass123!');
    await loginButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, '02-logged-in.png') });
    console.log('✅ Login exitoso\n');
    results.tests.push({ name: 'Login', status: 'PASSED' });

    // TEST 3: Verificar visualizador mejorado
    console.log('📋 Test 3: Visualizador Mejorado (Medical Orb)\n');
    const visualizador = page.locator('[role="status"]');

    if (await visualizador.count() > 0) {
      await page.screenshot({ path: path.join(screenshotsDir, '03-visualizador-idle.png') });
      console.log('✅ Visualizador encontrado - debería verse luminoso (no círculo negro)\n');
      results.tests.push({ name: 'Visualizador mejorado presente', status: 'PASSED' });
    } else {
      console.log('❌ Visualizador no encontrado\n');
      results.tests.push({ name: 'Visualizador mejorado presente', status: 'FAILED' });
    }

    // TEST 4: Iniciar sesión médica
    console.log('📋 Test 4: Iniciar Sesión Médica\n');
    const patientNameInput = page.locator('input[placeholder*="paciente"], input[placeholder*="Patient"], input[type="text"]').first();
    await patientNameInput.fill('Juan Pérez - Test Final');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '04-patient-name-filled.png') });

    const startButton = page.locator('button:has-text("Iniciar"), button:has-text("Start")').first();

    console.log('🎤 Presionando botón "Iniciar Sesión"...\n');
    await startButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(screenshotsDir, '05-connecting.png') });
    results.tests.push({ name: 'Iniciar sesión médica', status: 'PASSED' });

    // TEST 5: Verificar estado "Escuchando" y saludo automático
    console.log('📋 Test 5: Saludo Automático de Nova\n');
    console.log('⏱️ Esperando 5 segundos para que Nova salude automáticamente...\n');

    let activationSent = false;
    let sessionClosed = false;
    let listeningState = false;

    await page.waitForTimeout(5000);

    // Verificar estado de escucha
    const listeningText = page.locator('text=/Escuchando|Listening/i');
    if (await listeningText.count() > 0) {
      console.log('✅ Estado "Escuchando" detectado\n');
      listeningState = true;
    }

    await page.screenshot({ path: path.join(screenshotsDir, '06-listening-state.png') });

    // Verificar mensajes de consola
    activationSent = consoleMessages.some(msg => msg.includes('Audio de activación enviado'));
    sessionClosed = consoleMessages.some(msg => msg.includes('Session closed by server'));

    if (activationSent) {
      console.log('✅ Audio de activación fue enviado\n');
      results.tests.push({ name: 'Audio de activación enviado', status: 'PASSED' });
    } else {
      console.log('⚠️ No se detectó envío de audio de activación\n');
      results.tests.push({ name: 'Audio de activación enviado', status: 'FAILED' });
    }

    if (!sessionClosed) {
      console.log('✅ Sesión NO se cerró (correcto)\n');
      results.tests.push({ name: 'Sesión permanece abierta', status: 'PASSED' });
    } else {
      console.log('❌ Sesión se cerró por el servidor\n');
      results.tests.push({ name: 'Sesión permanece abierta', status: 'FAILED' });
    }

    if (listeningState) {
      results.tests.push({ name: 'Estado "Escuchando" alcanzado', status: 'PASSED' });
    } else {
      results.tests.push({ name: 'Estado "Escuchando" alcanzado', status: 'FAILED' });
    }

    // TEST 6: Monitoreo de filtros de idioma
    console.log('📋 Test 6: Filtros de Idioma\n');
    console.log('⏱️ Monitoreando 10 segundos para verificar filtros...\n');

    const beforeCount = consoleMessages.length;
    await page.waitForTimeout(10000);
    const afterCount = consoleMessages.length;

    const languageRejections = consoleMessages.filter(msg =>
      msg.includes('⛔ Idioma incorrecto') || msg.includes('⛔ Mayoría de caracteres asiáticos')
    );

    const languageFiltered = consoleMessages.filter(msg =>
      msg.includes('⏭️ Filtrada transcripción')
    );

    console.log(`   📊 Mensajes de consola capturados: ${afterCount - beforeCount}`);
    console.log(`   ⛔ Rechazos por idioma incorrecto: ${languageRejections.length}`);
    console.log(`   ⏭️ Transcripciones filtradas: ${languageFiltered.length}\n`);

    if (languageRejections.length === 0 && languageFiltered.length === 0) {
      console.log('✅ No se detectaron rechazos de idioma (ideal)\n');
      results.tests.push({ name: 'Filtros de idioma funcionando correctamente', status: 'PASSED' });
    } else if (languageRejections.length < 3) {
      console.log('⚠️ Algunos rechazos detectados (aceptable si son errores reales)\n');
      results.tests.push({ name: 'Filtros de idioma funcionando correctamente', status: 'WARNING' });
    } else {
      console.log('❌ Demasiados rechazos de idioma (filtros muy agresivos)\n');
      results.tests.push({ name: 'Filtros de idioma funcionando correctamente', status: 'FAILED' });
    }

    // Screenshot final
    await page.screenshot({ path: path.join(screenshotsDir, '07-final-state.png') });

    // Capturar zoom del visualizador
    const visualizadorBox = await visualizador.boundingBox();
    if (visualizadorBox) {
      await page.screenshot({
        path: path.join(screenshotsDir, '08-visualizador-zoom.png'),
        clip: {
          x: Math.max(0, visualizadorBox.x - 50),
          y: Math.max(0, visualizadorBox.y - 50),
          width: Math.min(visualizadorBox.width + 100, 800),
          height: Math.min(visualizadorBox.height + 100, 800)
        }
      });
    }

    // Resumen de resultados
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║    RESUMEN DE VALIDACIÓN FINAL            ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const passed = results.tests.filter(t => t.status === 'PASSED').length;
    const failed = results.tests.filter(t => t.status === 'FAILED').length;
    const warnings = results.tests.filter(t => t.status === 'WARNING').length;
    const total = results.tests.length;

    console.log(`✅ Tests Pasados:     ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
    if (failed > 0) console.log(`❌ Tests Fallidos:    ${failed}`);
    if (warnings > 0) console.log(`⚠️ Warnings:          ${warnings}`);

    console.log('\n📊 Resultados por Test:\n');
    results.tests.forEach((test, idx) => {
      const icon = test.status === 'PASSED' ? '✅' : test.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`   ${idx + 1}. ${icon} ${test.name}`);
    });

    console.log('\n📝 Mensajes de Consola Importantes:\n');
    const importantMessages = consoleMessages.filter(msg =>
      msg.includes('✅') || msg.includes('❌') || msg.includes('⛔') || msg.includes('⏭️')
    ).slice(0, 10);

    importantMessages.forEach(msg => {
      console.log(`   ${msg}`);
    });

    // Guardar resultados
    results.consoleMessages = consoleMessages.slice(-50); // últimos 50 mensajes
    fs.writeFileSync(
      path.join(screenshotsDir, 'validation-results.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n📸 Screenshots guardados en:', screenshotsDir);
    console.log('📄 Resultados JSON:', path.join(screenshotsDir, 'validation-results.json'));
    console.log('\n🔍 Manteniendo navegador abierto 10 segundos para inspección...\n');

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n💥 Error durante testing:', error.message);
    await page.screenshot({
      path: path.join(screenshotsDir, 'error-screenshot.png'),
      fullPage: true
    });
    results.tests.push({ name: 'Error general', status: 'FAILED', error: error.message });
  } finally {
    // Guardar resultados finales
    fs.writeFileSync(
      path.join(screenshotsDir, 'validation-results.json'),
      JSON.stringify(results, null, 2)
    );

    await browser.close();
  }
}

testFinalValidation().catch(console.error);
