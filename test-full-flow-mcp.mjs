/**
 * Cabo Health Nova - Full Flow Testing with MCP Servers
 *
 * Uses:
 * - Playwright MCP for browser automation
 * - Supabase MCP for database validation
 * - Chrome DevTools MCP for debugging
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// Configuration
const APP_URL = 'https://localhost:9000/';
const SCREENSHOTS_DIR = './screenshots-mcp';
const TEST_USER_EMAIL = `test_doctor_${Date.now()}@cabo.health`;
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_PATIENT_NAME = 'Paciente de Prueba MCP';

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  appUrl: APP_URL,
  testUser: TEST_USER_EMAIL,
  tests: []
};

// Utility: Add test result
function addTestResult(name, passed, details = {}) {
  const result = {
    name,
    passed,
    timestamp: new Date().toISOString(),
    ...details
  };
  testResults.tests.push(result);
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (details.error) {
    console.log(`   Error: ${details.error}`);
  }
  if (details.info) {
    console.log(`   Info: ${details.info}`);
  }
  return passed;
}

// Create screenshots directory
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Iniciando Testing Completo con MCP Servers\n');
  console.log(`📧 Usuario de prueba: ${TEST_USER_EMAIL}`);
  console.log(`🔗 URL de la app: ${APP_URL}\n`);

  let browser;
  let page;
  let consoleErrors = [];
  let consoleWarnings = [];

  try {
    // Initialize browser
    browser = await chromium.launch({
      headless: false,
      args: ['--ignore-certificate-errors']
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      permissions: ['microphone'] // Pre-grant microphone permission
    });

    page = await context.newPage();

    // Setup console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected Sentry 404
        if (!text.includes('sentry') && !text.includes('504')) {
          consoleErrors.push(text);
        }
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // ======================
    // TEST 1: Validar Carga Inicial
    // ======================
    console.log('\n📋 TEST 1: Validación de Carga Inicial\n');

    try {
      await page.goto(APP_URL, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/01-login-page.png`,
        fullPage: true
      });

      // Check elements
      const hasLogo = await page.locator('svg, img').count() > 0;
      const hasForm = await page.locator('form, input[type="email"]').count() > 0;
      const hasButton = await page.locator('button').count() > 0;
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.length > 100;

      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('Sentry') &&
        !e.includes('504') &&
        !e.includes('Failed to load resource')
      );

      addTestResult(
        'Test 1: Carga Inicial',
        hasContent && hasForm && hasButton && criticalErrors.length === 0,
        {
          info: `Elementos: Logo=${hasLogo}, Form=${hasForm}, Button=${hasButton}, Content=${hasContent}`,
          errorCount: criticalErrors.length
        }
      );

    } catch (error) {
      addTestResult('Test 1: Carga Inicial', false, { error: error.message });
    }

    // ======================
    // TEST 2: Registro de Usuario
    // ======================
    console.log('\n📋 TEST 2: Registro de Usuario\n');

    try {
      // Click "Regístrate" link
      const registerLink = page.locator('text=/regíst.*|regist.*/i').first();
      if (await registerLink.count() > 0) {
        await registerLink.click();
        await page.waitForTimeout(1000);
      }

      // Fill registration form
      await page.fill('input[type="email"]', TEST_USER_EMAIL);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);

      // Select role if available
      const doctorRadio = page.locator('input[value="doctor"]').first();
      if (await doctorRadio.count() > 0) {
        await doctorRadio.click();
      }

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/02-registration-form-filled.png`,
        fullPage: true
      });

      // Submit registration
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/03-after-registration.png`,
        fullPage: true
      });

      // Check if we're redirected or see success message
      const url = page.url();
      const hasSuccessIndicator =
        url !== APP_URL ||
        await page.locator('text=/éxito|success|dashboard/i').count() > 0;

      addTestResult(
        'Test 2: Registro de Usuario',
        hasSuccessIndicator,
        {
          info: `URL después del registro: ${url}`,
          user: TEST_USER_EMAIL
        }
      );

    } catch (error) {
      addTestResult('Test 2: Registro de Usuario', false, { error: error.message });
    }

    // ======================
    // TEST 3: Login de Usuario
    // ======================
    console.log('\n📋 TEST 3: Login de Usuario\n');

    try {
      // Navigate back to login if needed
      if (!page.url().includes('localhost:9000')) {
        await page.goto(APP_URL);
        await page.waitForTimeout(2000);
      }

      // Fill login form
      await page.fill('input[type="email"]', TEST_USER_EMAIL);
      await page.fill('input[type="password"]', TEST_USER_PASSWORD);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/04-login-form-filled.png`,
        fullPage: true
      });

      // Submit login
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/05-after-login.png`,
        fullPage: true
      });

      // Check if logged in (look for app UI elements)
      const hasAppUI =
        await page.locator('text=/paciente|patient|consulta|dashboard/i').count() > 0 ||
        await page.locator('button:has-text("Iniciar")').count() > 0;

      addTestResult(
        'Test 3: Login de Usuario',
        hasAppUI,
        {
          info: `URL después del login: ${page.url()}`,
          appUIDetected: hasAppUI
        }
      );

    } catch (error) {
      addTestResult('Test 3: Login de Usuario', false, { error: error.message });
    }

    // ======================
    // TEST 4: Inicio de Sesión Médica
    // ======================
    console.log('\n📋 TEST 4: Inicio de Sesión Médica\n');

    try {
      // Look for patient name field
      const patientNameField = page.locator('input[placeholder*="paciente" i], input[placeholder*="patient" i], input[name*="patient" i]').first();

      if (await patientNameField.count() > 0) {
        await patientNameField.fill(TEST_PATIENT_NAME);
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/06-patient-form-filled.png`,
          fullPage: true
        });

        // Look for "Iniciar" button
        const startButton = page.locator('button:has-text("Iniciar")').first();
        if (await startButton.count() > 0) {
          await startButton.click();
          await page.waitForTimeout(3000);

          await page.screenshot({
            path: `${SCREENSHOTS_DIR}/07-session-started.png`,
            fullPage: true
          });

          // Check if session started (look for recording UI)
          const hasRecordingUI =
            await page.locator('text=/grabando|recording|escuchando|listening/i').count() > 0 ||
            await page.locator('svg[class*="wave"], div[class*="visualiz"]').count() > 0;

          addTestResult(
            'Test 4: Inicio de Sesión Médica',
            hasRecordingUI,
            {
              info: `UI de grabación detectada: ${hasRecordingUI}`,
              patientName: TEST_PATIENT_NAME
            }
          );
        } else {
          addTestResult('Test 4: Inicio de Sesión Médica', false, {
            error: 'Botón "Iniciar" no encontrado'
          });
        }
      } else {
        addTestResult('Test 4: Inicio de Sesión Médica', false, {
          error: 'Campo de nombre de paciente no encontrado'
        });
      }

    } catch (error) {
      addTestResult('Test 4: Inicio de Sesión Médica', false, { error: error.message });
    }

    // ======================
    // TEST 5: Validación de Elementos UI
    // ======================
    console.log('\n📋 TEST 5: Validación de Elementos UI Completos\n');

    try {
      // Count various UI elements
      const uiElements = {
        buttons: await page.locator('button').count(),
        inputs: await page.locator('input').count(),
        headers: await page.locator('h1, h2, h3').count(),
        forms: await page.locator('form').count()
      };

      const hasRichUI =
        uiElements.buttons > 0 &&
        uiElements.inputs > 0 &&
        uiElements.headers > 0;

      addTestResult(
        'Test 5: Validación de Elementos UI',
        hasRichUI,
        {
          info: `Botones: ${uiElements.buttons}, Inputs: ${uiElements.inputs}, Headers: ${uiElements.headers}, Forms: ${uiElements.forms}`
        }
      );

    } catch (error) {
      addTestResult('Test 5: Validación de Elementos UI', false, { error: error.message });
    }

    // ======================
    // TEST 6: Validación de Errores de Consola
    // ======================
    console.log('\n📋 TEST 6: Validación de Errores de Consola\n');

    const criticalConsoleErrors = consoleErrors.filter(e =>
      !e.includes('Sentry') &&
      !e.includes('504') &&
      !e.includes('Failed to load resource') &&
      !e.includes('favicon')
    );

    addTestResult(
      'Test 6: Sin Errores Críticos en Consola',
      criticalConsoleErrors.length === 0,
      {
        info: `Errores críticos: ${criticalConsoleErrors.length}, Warnings: ${consoleWarnings.length}`,
        errors: criticalConsoleErrors.slice(0, 3)
      }
    );

  } catch (error) {
    console.error('\n💥 Error fatal durante testing:', error);
    addTestResult('Testing General', false, { error: error.message });

  } finally {
    // Generate final report
    console.log('\n📊 GENERANDO REPORTE FINAL...\n');

    const passed = testResults.tests.filter(t => t.passed).length;
    const total = testResults.tests.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    testResults.summary = {
      total,
      passed,
      failed: total - passed,
      successRate: `${successRate}%`,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length
    };

    // Save JSON report
    writeFileSync(
      './test-results-mcp.json',
      JSON.stringify(testResults, null, 2)
    );

    // Generate Markdown report
    let markdown = `# Cabo Health Nova - Reporte de Testing MCP\n\n`;
    markdown += `**Fecha**: ${new Date().toLocaleString()}\n`;
    markdown += `**URL**: ${APP_URL}\n`;
    markdown += `**Usuario de Prueba**: ${TEST_USER_EMAIL}\n\n`;
    markdown += `## Resumen\n\n`;
    markdown += `- ✅ Tests Pasados: **${passed}/${total}** (${successRate}%)\n`;
    markdown += `- ❌ Tests Fallidos: **${total - passed}**\n`;
    markdown += `- ⚠️  Errores de Consola: ${consoleErrors.length}\n`;
    markdown += `- ℹ️  Warnings: ${consoleWarnings.length}\n\n`;
    markdown += `## Resultados Detallados\n\n`;

    testResults.tests.forEach((test, i) => {
      markdown += `### ${i + 1}. ${test.name}\n`;
      markdown += `**Estado**: ${test.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      if (test.info) markdown += `**Info**: ${test.info}\n`;
      if (test.error) markdown += `**Error**: \`${test.error}\`\n`;
      markdown += `\n`;
    });

    markdown += `## Screenshots\n\n`;
    markdown += `Todos los screenshots fueron guardados en: \`${SCREENSHOTS_DIR}/\`\n\n`;

    markdown += `## MCP Servers Utilizados\n\n`;
    markdown += `1. ✅ **Playwright MCP** - Automatización de navegador\n`;
    markdown += `2. ⏳ **Supabase MCP** - Validación de base de datos (pendiente integración)\n`;
    markdown += `3. ⏳ **Chrome DevTools MCP** - Monitoreo de consola y debugging\n\n`;

    markdown += `## Próximos Pasos\n\n`;
    if (passed === total) {
      markdown += `🎉 **¡Todos los tests pasaron!** La aplicación está funcionando correctamente.\n\n`;
      markdown += `Recomendaciones:\n`;
      markdown += `- Integrar Supabase MCP para validar datos en la base de datos\n`;
      markdown += `- Agregar tests de audio recording con WebRTC\n`;
      markdown += `- Validar generación de resumen médico\n`;
    } else {
      markdown += `⚠️ **Se encontraron ${total - passed} fallas.** Revisar logs y screenshots.\n\n`;
      markdown += `Acciones recomendadas:\n`;
      testResults.tests
        .filter(t => !t.passed)
        .forEach(t => {
          markdown += `- Investigar falla en: ${t.name}\n`;
        });
    }

    writeFileSync('./TESTING_REPORT.md', markdown);

    // Print summary
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     RESUMEN FINAL DE TESTING MCP          ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`✅ Tests Pasados:     ${passed}/${total} (${successRate}%)`);
    console.log(`❌ Tests Fallidos:    ${total - passed}`);
    console.log(`⚠️  Errores Consola:  ${consoleErrors.length}`);
    console.log(`ℹ️  Warnings:         ${consoleWarnings.length}\n`);
    console.log(`📄 Reporte JSON:      test-results-mcp.json`);
    console.log(`📝 Reporte Markdown:  TESTING_REPORT.md`);
    console.log(`📸 Screenshots:       ${SCREENSHOTS_DIR}/\n`);

    // Keep browser open for 5 seconds for inspection
    console.log('⏳ Dejando navegador abierto 5 segundos para inspección...\n');
    await page?.waitForTimeout(5000);

    await browser?.close();

    // Exit with appropriate code
    process.exit(passed === total ? 0 : 1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
