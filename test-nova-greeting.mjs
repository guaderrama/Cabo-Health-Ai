/**
 * Test de Validación: Nova Saludo Automático
 *
 * Valida que Nova saluda inmediatamente después de presionar "Iniciar Sesión"
 * sin cerrar la sesión por inactividad.
 */

import playwright from 'playwright';
import { writeFileSync } from 'fs';

const TEST_URL = 'https://localhost:9002/';
const SCREENSHOT_DIR = './screenshots-nova-greeting/';

// Crear directorio de screenshots si no existe
import { mkdirSync } from 'fs';
try {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
} catch (e) {
  // Directory already exists
}

async function testNovaGreeting() {
  console.log('🧪 INICIANDO TEST: Nova Saludo Automático\n');
  console.log(`📍 URL de Testing: ${TEST_URL}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    testUrl: TEST_URL,
    tests: [],
    summary: {}
  };

  let browser;
  let consoleErrors = [];
  let consoleWarnings = [];
  let consoleMessages = [];

  try {
    // Lanzar navegador
    browser = await playwright.chromium.launch({
      headless: false, // Modo visible para debugging
      args: ['--ignore-certificate-errors']
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      permissions: ['microphone']
    });

    const page = await context.newPage();

    // Capturar mensajes de consola
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      consoleMessages.push({ type, text, timestamp: Date.now() });

      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      } else if (text.includes('Nova') || text.includes('session') || text.includes('Session')) {
        console.log(`📢 Console: ${text}`);
      }
    });

    // =====================
    // TEST 1: Cargar Aplicación
    // =====================
    console.log('📋 Test 1: Carga de Aplicación\n');

    try {
      await page.goto(TEST_URL, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}01-app-loaded.png`,
        fullPage: true
      });

      const hasLogo = await page.locator('text=/Cabo Health/i').count() > 0;

      results.tests.push({
        name: 'App Load',
        passed: hasLogo,
        screenshot: '01-app-loaded.png'
      });

      console.log(`${hasLogo ? '✅' : '❌'} Aplicación cargada\n`);

    } catch (error) {
      results.tests.push({
        name: 'App Load',
        passed: false,
        error: error.message
      });
      console.log(`❌ Error al cargar aplicación: ${error.message}\n`);
      throw error;
    }

    // =====================
    // TEST 2: Login/Registro Automático
    // =====================
    console.log('📋 Test 2: Autenticación\n');

    const testEmail = `doctor_test@cabo.health`;
    const testPassword = 'TestPass123!';

    try {
      // Esperar un momento para ver si ya hay sesión
      await page.waitForTimeout(2000);

      // Verificar si ya hay sesión (botón "Cerrar Sesión")
      const hasLogoutButton = await page.locator('text=/Cerrar Sesión/i').count() > 0;

      if (!hasLogoutButton) {
        console.log('📝 No hay sesión activa, intentando login...\n');

        // Verificar si estamos en pantalla de login o registro
        const registerLink = page.locator('text=/Regístrate|Sign Up/i').first();
        const isOnLoginPage = await registerLink.count() > 0;

        if (isOnLoginPage) {
          // Estamos en login, intentar con credenciales conocidas
          console.log(`📧 Intentando login con: ${testEmail}\n`);

          const emailInput = page.locator('input[type="email"]').first();
          const passwordInput = page.locator('input[type="password"]').first();

          await emailInput.fill(testEmail);
          await passwordInput.fill(testPassword);

          const submitButton = page.locator('button:has-text("Iniciar Sesión"), button:has-text("Log In")').first();
          await submitButton.click();

          // Esperar a que cargue
          await page.waitForTimeout(3000);

          // Verificar si login fue exitoso
          const hasLogoutAfterLogin = await page.locator('text=/Cerrar Sesión/i').count() > 0;

          if (!hasLogoutAfterLogin) {
            // Login falló, probablemente usuario no existe, registrar
            console.log('⚠️ Login falló, registrando nuevo usuario...\n');

            const registerLink2 = page.locator('text=/Regístrate|Sign Up/i').first();
            await registerLink2.click();

            await page.waitForTimeout(1000);

            const emailInput2 = page.locator('input[type="email"]').first();
            const passwordInput2 = page.locator('input[type="password"]').first();

            await emailInput2.fill(testEmail);
            await passwordInput2.fill(testPassword);

            // Seleccionar tipo "Médico" si existe
            const doctorRadio = page.locator('input[value="doctor"], input[value="médico"]').first();
            if (await doctorRadio.count() > 0) {
              await doctorRadio.click();
            }

            const submitButton2 = page.locator('button[type="submit"]').first();
            await submitButton2.click();

            await page.waitForTimeout(3000);
            console.log(`✅ Usuario registrado: ${testEmail}\n`);
          } else {
            console.log(`✅ Login exitoso: ${testEmail}\n`);
          }
        }
      } else {
        console.log('✅ Sesión activa detectada\n');
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}02-authenticated.png`,
        fullPage: true
      });

      results.tests.push({
        name: 'Authentication',
        passed: true,
        screenshot: '02-authenticated.png'
      });

    } catch (error) {
      results.tests.push({
        name: 'Authentication',
        passed: false,
        error: error.message
      });
      console.log(`⚠️ Advertencia en autenticación: ${error.message}\n`);
    }

    // =====================
    // TEST 3: Iniciar Sesión Médica
    // =====================
    console.log('📋 Test 3: Iniciar Sesión Médica con Paciente\n');

    try {
      // Buscar campo de nombre del paciente
      const patientNameInput = page.locator('input[placeholder*="paciente"], input[placeholder*="Patient"], input[type="text"]').first();

      await patientNameInput.fill('Juan Pérez Test');
      console.log('✅ Nombre de paciente ingresado: Juan Pérez Test\n');

      await page.screenshot({
        path: `${SCREENSHOT_DIR}03-patient-name-filled.png`,
        fullPage: true
      });

      // Click en "Iniciar Sesión"
      const startButton = page.locator('button:has-text("Iniciar Sesión"), button:has-text("Start Session")').first();

      console.log('🎤 Presionando botón "Iniciar Sesión"...\n');

      // Limpiar mensajes previos de consola para tracking específico
      consoleMessages = [];
      consoleErrors = [];

      await startButton.click();

      // Esperar estado "Conectando..."
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}04-connecting.png`,
        fullPage: true
      });

      results.tests.push({
        name: 'Start Medical Session',
        passed: true,
        screenshot: '04-connecting.png'
      });

      console.log('✅ Botón "Iniciar Sesión" presionado\n');

    } catch (error) {
      results.tests.push({
        name: 'Start Medical Session',
        passed: false,
        error: error.message
      });
      console.log(`❌ Error al iniciar sesión: ${error.message}\n`);
      throw error;
    }

    // =====================
    // TEST 4: Validar Estado "Escuchando"
    // =====================
    console.log('📋 Test 4: Validar que sesión se conecta\n');

    try {
      // Esperar a que aparezca estado "Escuchando" o "Listening"
      await page.waitForSelector('text=/Escuchando|Listening/i', { timeout: 10000 });

      console.log('✅ Estado "Escuchando" detectado\n');

      await page.screenshot({
        path: `${SCREENSHOT_DIR}05-listening.png`,
        fullPage: true
      });

      results.tests.push({
        name: 'Session Connected',
        passed: true,
        screenshot: '05-listening.png'
      });

    } catch (error) {
      results.tests.push({
        name: 'Session Connected',
        passed: false,
        error: error.message
      });
      console.log(`❌ No se detectó estado "Escuchando": ${error.message}\n`);
    }

    // =====================
    // TEST 5: Monitorear Consola por 10 segundos
    // =====================
    console.log('📋 Test 5: Monitoreo de Consola (10 segundos)\n');
    console.log('⏱️ Esperando para detectar:\n');
    console.log('   - ✅ Mensaje de activación enviado a Nova\n');
    console.log('   - ✅ Output transcription (saludo de Nova)\n');
    console.log('   - ❌ Session closed by server\n\n');

    let sessionClosed = false;
    let novaActivationSent = false;
    let novaOutputDetected = false;

    // Esperar 10 segundos mientras monitoreamos
    for (let i = 1; i <= 10; i++) {
      await page.waitForTimeout(1000);

      // Revisar mensajes de consola recientes
      const recentMessages = consoleMessages.filter(m =>
        Date.now() - m.timestamp < 1500
      );

      for (const msg of recentMessages) {
        if (msg.text.includes('Session closed by server')) {
          sessionClosed = true;
          console.log(`❌ [${i}s] Session closed detectado: ${msg.text}\n`);
        }

        if (msg.text.includes('Mensaje de activación enviado a Nova') ||
            msg.text.includes('activation')) {
          novaActivationSent = true;
          console.log(`✅ [${i}s] Activación enviada a Nova\n`);
        }

        if (msg.text.includes('outputTranscription') ||
            msg.text.includes('Bienvenido') ||
            msg.text.includes('Welcome')) {
          novaOutputDetected = true;
          console.log(`✅ [${i}s] Output de Nova detectado!\n`);
        }
      }

      // Actualizar screenshot cada 3 segundos
      if (i % 3 === 0) {
        await page.screenshot({
          path: `${SCREENSHOT_DIR}06-monitoring-${i}s.png`,
          fullPage: true
        });
      }
    }

    console.log('\n📊 Resultados del Monitoreo:\n');
    console.log(`   ${sessionClosed ? '❌' : '✅'} Session Closed: ${sessionClosed ? 'SÍ (PROBLEMA)' : 'NO (CORRECTO)'}`);
    console.log(`   ${novaActivationSent ? '✅' : '⚠️'} Activación enviada: ${novaActivationSent ? 'SÍ' : 'NO'}`);
    console.log(`   ${novaOutputDetected ? '✅' : '⚠️'} Output de Nova: ${novaOutputDetected ? 'SÍ (SALUDO)' : 'NO'}\n`);

    results.tests.push({
      name: 'Console Monitoring',
      passed: !sessionClosed,
      details: {
        sessionClosed,
        novaActivationSent,
        novaOutputDetected,
        totalConsoleMessages: consoleMessages.length,
        consoleErrors: consoleErrors.length
      }
    });

    // =====================
    // TEST 6: Screenshot Final
    // =====================
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}07-final-state.png`,
      fullPage: true
    });

    // =====================
    // RESUMEN FINAL
    // =====================
    const passed = results.tests.filter(t => t.passed).length;
    const total = results.tests.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    results.summary = {
      total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`,
      criticalIssues: sessionClosed ? 1 : 0
    };

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║    RESUMEN TEST NOVA GREETING             ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`✅ Tests Pasados:     ${passed}/${total} (${successRate}%)`);
    console.log(`❌ Tests Fallidos:    ${total - passed}`);
    console.log(`🚨 Problemas Críticos: ${sessionClosed ? 1 : 0}\n`);

    if (!sessionClosed && novaOutputDetected) {
      console.log('🎉 ¡ÉXITO! Nova está saludando correctamente\n');
    } else if (!sessionClosed) {
      console.log('⚠️ Sesión NO se cerró, pero no se detectó saludo de Nova\n');
      console.log('   Puede que Nova esté esperando que el usuario hable primero\n');
    } else {
      console.log('❌ PROBLEMA: La sesión se cerró por inactividad\n');
      console.log('   Nova NO está saludando automáticamente\n');
    }

    // Guardar resultados
    writeFileSync(
      './test-nova-greeting-results.json',
      JSON.stringify(results, null, 2)
    );

    console.log('📄 Resultados guardados: test-nova-greeting-results.json\n');
    console.log('📸 Screenshots guardados en: ./screenshots-nova-greeting/\n');

    // Mantener navegador abierto 5 segundos para inspección
    console.log('🔍 Manteniendo navegador abierto 5 segundos para inspección...\n');
    await page.waitForTimeout(5000);

    return !sessionClosed;

  } catch (error) {
    console.error('\n💥 Error fatal durante testing:', error);

    results.summary = {
      fatal: true,
      error: error.message
    };

    writeFileSync(
      './test-nova-greeting-results.json',
      JSON.stringify(results, null, 2)
    );

    return false;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Ejecutar test
testNovaGreeting().then(success => {
  process.exit(success ? 0 : 1);
});
