import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const timestamp = Date.now();
const testEmail = `claude-test-${timestamp}@example.com`;
const testPassword = 'TestPassword123!';
const screenshotsDir = join(process.cwd(), 'test-screenshots');

console.log('='.repeat(80));
console.log('CABO HEALTH NOVA - PRUEBA DE REGISTRO AUTOMATIZADA');
console.log('='.repeat(80));
console.log(`📧 Email de prueba: ${testEmail}`);
console.log(`🔒 Password: ${testPassword}`);
console.log(`📸 Screenshots en: ${screenshotsDir}`);
console.log('='.repeat(80));

const results = {
  steps: [],
  consoleErrors: [],
  networkRequests: [],
  supabaseResponses: [],
  finalState: 'unknown',
  screenshots: []
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down by 500ms for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: './test-videos/',
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);

    if (type === 'error' || type === 'warning') {
      results.consoleErrors.push({ type, text, timestamp: new Date().toISOString() });
    }
  });

  // Capture network requests (especially Supabase)
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase') || url.includes('auth')) {
      console.log(`[REQUEST] ${request.method()} ${url}`);
      results.networkRequests.push({
        method: request.method(),
        url,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Capture network responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('auth')) {
      const status = response.status();
      console.log(`[RESPONSE] ${status} ${url}`);

      try {
        const body = await response.text();
        const responseData = {
          status,
          url,
          statusText: response.statusText(),
          timestamp: new Date().toISOString(),
          body: body.substring(0, 500) // Limit size
        };

        results.supabaseResponses.push(responseData);

        // Log important responses
        if (status === 401) {
          console.log('❌ ERROR 401: Invalid API key detectado!');
        } else if (status === 200) {
          console.log('✅ Respuesta 200 OK de Supabase');
        }
      } catch (e) {
        console.log(`[RESPONSE] Could not parse body: ${e.message}`);
      }
    }
  });

  try {
    // STEP 1: Navigate to localhost:9000
    console.log('\n🌐 PASO 1: Navegando a http://localhost:9000...');
    await page.goto('http://localhost:9000', { waitUntil: 'networkidle' });
    await delay(2000);

    const screenshot1 = `${screenshotsDir}/01-initial-load.png`;
    await page.screenshot({ path: screenshot1, fullPage: true });
    results.screenshots.push(screenshot1);
    results.steps.push({ step: 1, name: 'Navigate to localhost:9000', status: '✅' });
    console.log('✅ Página cargada');

    // STEP 2: Click on "Regístrate" link to go to registration form
    console.log('\n📝 PASO 2: Haciendo click en "Regístrate"...');

    const registerLink = await page.locator('a:has-text("Regístrate"), a:has-text("Registrate"), button:has-text("Regístrate")').first();
    await registerLink.waitFor({ state: 'visible', timeout: 10000 });
    await registerLink.click();
    console.log('   ✅ Click en enlace de registro');
    await delay(2000);

    const screenshot2 = `${screenshotsDir}/02-registration-page.png`;
    await page.screenshot({ path: screenshot2, fullPage: true });
    results.screenshots.push(screenshot2);
    results.steps.push({ step: 2, name: 'Navigate to registration form', status: '✅' });

    // STEP 2b: Wait for registration form to appear
    console.log('\n📝 PASO 2b: Esperando formulario de registro...');

    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    const screenshot2b = `${screenshotsDir}/02b-form-visible.png`;
    await page.screenshot({ path: screenshot2b, fullPage: true });
    results.screenshots.push(screenshot2b);
    results.steps.push({ step: '2b', name: 'Registration form visible', status: '✅' });
    console.log('✅ Formulario de registro encontrado');

    // STEP 3: Fill the form
    console.log('\n✍️ PASO 3: Llenando el formulario...');

    // Fill email
    await emailInput.fill(testEmail);
    console.log(`   ✅ Email ingresado: ${testEmail}`);
    await delay(500);

    // Find password input
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill(testPassword);
    console.log(`   ✅ Password ingresada`);
    await delay(500);

    const screenshot3 = `${screenshotsDir}/03-form-filled.png`;
    await page.screenshot({ path: screenshot3, fullPage: true });
    results.screenshots.push(screenshot3);
    results.steps.push({ step: 3, name: 'Fill registration form', status: '✅' });

    // STEP 4: Click register button
    console.log('\n🖱️ PASO 4: Haciendo click en "Registrarse"...');

    // Try to find the register button
    const registerButton = await page.locator('button:has-text("Registrarse"), button:has-text("Register"), button[type="submit"]').first();

    const screenshot4 = `${screenshotsDir}/04-before-submit.png`;
    await page.screenshot({ path: screenshot4, fullPage: true });
    results.screenshots.push(screenshot4);

    // Click and wait for response
    await registerButton.click();
    console.log('   ✅ Click realizado');
    results.steps.push({ step: 4, name: 'Click register button', status: '✅' });

    // Wait for network activity to settle
    await delay(3000);

    const screenshot5 = `${screenshotsDir}/05-after-submit.png`;
    await page.screenshot({ path: screenshot5, fullPage: true });
    results.screenshots.push(screenshot5);

    // STEP 5: Check for success/error messages
    console.log('\n🔍 PASO 5: Verificando resultado...');

    // Check for error messages
    const errorElements = await page.locator('[class*="error"], [role="alert"], .error-message').all();
    if (errorElements.length > 0) {
      console.log('⚠️ Elementos de error encontrados en la página');
      for (const el of errorElements) {
        const text = await el.textContent();
        if (text && text.trim()) {
          console.log(`   ❌ Error: ${text}`);
          results.consoleErrors.push({ type: 'ui-error', text, timestamp: new Date().toISOString() });
        }
      }
    }

    // Check for success messages
    const successElements = await page.locator('[class*="success"], .success-message').all();
    if (successElements.length > 0) {
      console.log('✅ Elementos de éxito encontrados');
      for (const el of successElements) {
        const text = await el.textContent();
        if (text && text.trim()) {
          console.log(`   ✅ Éxito: ${text}`);
        }
      }
      results.finalState = 'success';
    }

    // Wait a bit more to see if there's a redirect or state change
    await delay(3000);

    const screenshot6 = `${screenshotsDir}/06-final-state.png`;
    await page.screenshot({ path: screenshot6, fullPage: true });
    results.screenshots.push(screenshot6);

    // Check current URL
    const finalUrl = page.url();
    console.log(`📍 URL final: ${finalUrl}`);

    if (finalUrl !== 'http://localhost:9000/' && finalUrl !== 'http://localhost:9000') {
      console.log('✅ Hubo redirección después del registro');
      results.finalState = 'redirected';
    }

    results.steps.push({ step: 5, name: 'Capture final state', status: '✅' });

  } catch (error) {
    console.error('\n❌ ERROR durante la prueba:', error.message);
    results.steps.push({ step: 'error', name: error.message, status: '❌' });

    // Take error screenshot
    const errorScreenshot = `${screenshotsDir}/error-screenshot.png`;
    await page.screenshot({ path: errorScreenshot, fullPage: true });
    results.screenshots.push(errorScreenshot);
  } finally {
    await delay(2000);
    await context.close();
    await browser.close();
  }
}

// Run the test
try {
  await runTest();

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));

  console.log('\n📋 PASOS EJECUTADOS:');
  results.steps.forEach(step => {
    console.log(`   ${step.status} Paso ${step.step}: ${step.name}`);
  });

  console.log('\n🔴 ERRORES DE CONSOLA:');
  if (results.consoleErrors.length === 0) {
    console.log('   ✅ No se detectaron errores en consola');
  } else {
    results.consoleErrors.forEach((error, i) => {
      console.log(`   ${i + 1}. [${error.type}] ${error.text}`);
    });
  }

  console.log('\n🌐 RESPUESTAS DE SUPABASE:');
  if (results.supabaseResponses.length === 0) {
    console.log('   ⚠️ No se detectaron peticiones a Supabase');
  } else {
    results.supabaseResponses.forEach((resp, i) => {
      const statusIcon = resp.status === 200 ? '✅' : resp.status === 401 ? '❌' : '⚠️';
      console.log(`   ${statusIcon} ${resp.status} ${resp.statusText} - ${resp.url}`);
      if (resp.body) {
        console.log(`      Body: ${resp.body.substring(0, 200)}...`);
      }
    });
  }

  console.log('\n📸 SCREENSHOTS CAPTURADOS:');
  results.screenshots.forEach(screenshot => {
    console.log(`   📷 ${screenshot}`);
  });

  console.log('\n🏁 ESTADO FINAL:');
  const hasApiKeyError = results.supabaseResponses.some(r => r.status === 401);
  const hasSuccessResponse = results.supabaseResponses.some(r => r.status === 200);
  const hasConsoleErrors = results.consoleErrors.some(e => e.text.includes('Invalid API key') || e.text.includes('401'));

  if (hasApiKeyError) {
    console.log('   ❌ ERROR: Todavía aparece "Invalid API key" (401)');
  } else if (hasSuccessResponse) {
    console.log('   ✅ ÉXITO: Supabase aceptó la API key (200 OK)');
  } else {
    console.log('   ⚠️ ADVERTENCIA: No se detectaron peticiones a Supabase');
  }

  if (hasConsoleErrors) {
    console.log('   ❌ Hay errores en la consola del navegador');
  }

  console.log('\n' + '='.repeat(80));

  // Save results to JSON
  const resultsFile = join(process.cwd(), 'test-results.json');
  writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Resultados guardados en: ${resultsFile}`);

} catch (error) {
  console.error('\n❌ ERROR FATAL:', error);
  process.exit(1);
}
