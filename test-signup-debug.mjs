import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';

async function debugSignup() {
  console.log('🚀 Iniciando análisis de signup...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMessages = [];
  const networkRequests = [];
  const networkResponses = [];
  const errors = [];

  // Capturar mensajes de consola
  page.on('console', msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    };
    consoleMessages.push(entry);
    console.log(`📝 Console [${msg.type()}]:`, msg.text());
  });

  // Capturar errores de página
  page.on('pageerror', error => {
    const errorEntry = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    errors.push(errorEntry);
    console.log('❌ Page Error:', error.message);
    console.log('Stack:', error.stack);
  });

  // Capturar requests de red
  page.on('request', request => {
    const url = request.url();
    if (url.includes('supabase')) {
      const headers = request.headers();
      const postData = request.postData();

      const requestInfo = {
        url,
        method: request.method(),
        headers,
        postData: postData ? (postData.length > 1000 ? postData.substring(0, 1000) + '...' : postData) : null,
        timestamp: new Date().toISOString()
      };

      networkRequests.push(requestInfo);

      console.log('\n🌐 REQUEST to Supabase:');
      console.log('URL:', url);
      console.log('Method:', request.method());
      console.log('Headers:', JSON.stringify(headers, null, 2));
      if (postData) {
        console.log('Body:', postData.substring(0, 500));
      }
    }
  });

  // Capturar responses de red
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('supabase')) {
      try {
        const status = response.status();
        const headers = response.headers();
        let body = null;

        try {
          body = await response.text();
        } catch (e) {
          body = `[No se pudo leer el body: ${e.message}]`;
        }

        const responseInfo = {
          url,
          status,
          statusText: response.statusText(),
          headers,
          body: body ? (body.length > 2000 ? body.substring(0, 2000) + '...' : body) : null,
          timestamp: new Date().toISOString()
        };

        networkResponses.push(responseInfo);

        console.log('\n📥 RESPONSE from Supabase:');
        console.log('URL:', url);
        console.log('Status:', status, response.statusText());
        console.log('Headers:', JSON.stringify(headers, null, 2));
        if (body) {
          console.log('Body:', body.substring(0, 500));
        }
      } catch (e) {
        console.error('Error capturando response:', e.message);
      }
    }
  });

  try {
    console.log('\n🔗 Navegando a http://localhost:9000...\n');
    await page.goto('http://localhost:9000', { waitUntil: 'networkidle' });

    // Esperar un poco para que cargue completamente
    await page.waitForTimeout(2000);

    console.log('\n📸 Capturando estado inicial...\n');

    // Tomar screenshot inicial
    await page.screenshot({ path: 'debug-screenshot-1-initial.png', fullPage: true });

    // Buscar el botón de registro o link
    console.log('🔍 Buscando formulario de registro...\n');

    // Intentar encontrar el link/botón de "Sign Up" o "Registrarse"
    const signUpButton = await page.locator('text=/sign.*up|registr/i').first();

    if (await signUpButton.count() > 0) {
      console.log('✅ Encontrado botón de registro, haciendo click...\n');
      await signUpButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug-screenshot-2-signup-form.png', fullPage: true });
    }

    // Buscar campos de formulario
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();

    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      console.log('✅ Formulario encontrado, llenando datos...\n');

      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';

      await emailInput.fill(testEmail);
      await passwordInput.fill(testPassword);

      console.log(`📧 Email de prueba: ${testEmail}\n`);

      await page.screenshot({ path: 'debug-screenshot-3-form-filled.png', fullPage: true });

      // Buscar botón de submit
      const submitButton = await page.locator('button[type="submit"]').first();

      if (await submitButton.count() > 0) {
        console.log('🎯 Enviando formulario...\n');

        // Click y esperar por la respuesta
        await submitButton.click();

        // Esperar un poco para que se procese la request
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'debug-screenshot-4-after-submit.png', fullPage: true });

        console.log('\n✅ Formulario enviado, esperando respuestas...\n');
      } else {
        console.log('⚠️ No se encontró botón de submit\n');
      }
    } else {
      console.log('⚠️ No se encontraron campos de email/password\n');
    }

    // Esperar un poco más para capturar cualquier error tardío
    await page.waitForTimeout(3000);

  } catch (e) {
    console.error('\n❌ Error durante la prueba:', e.message);
    console.error('Stack:', e.stack);
    errors.push({
      message: e.message,
      stack: e.stack,
      name: e.name,
      source: 'test-script'
    });
  }

  // Generar reporte completo
  const report = {
    timestamp: new Date().toISOString(),
    consoleMessages,
    networkRequests,
    networkResponses,
    errors,
    summary: {
      totalConsoleMessages: consoleMessages.length,
      totalNetworkRequests: networkRequests.length,
      totalNetworkResponses: networkResponses.length,
      totalErrors: errors.length,
      supabaseRequests: networkRequests.filter(r => r.url.includes('supabase')).length,
      supabaseResponses: networkResponses.filter(r => r.url.includes('supabase')).length
    }
  };

  // Guardar reporte
  const reportPath = 'debug-signup-report.json';
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DEL ANÁLISIS');
  console.log('='.repeat(80));
  console.log(`✅ Mensajes de consola: ${consoleMessages.length}`);
  console.log(`✅ Requests de red: ${networkRequests.length}`);
  console.log(`✅ Responses de red: ${networkResponses.length}`);
  console.log(`✅ Errores capturados: ${errors.length}`);
  console.log(`✅ Requests a Supabase: ${report.summary.supabaseRequests}`);
  console.log(`✅ Responses de Supabase: ${report.summary.supabaseResponses}`);
  console.log('='.repeat(80));
  console.log(`\n📄 Reporte completo guardado en: ${reportPath}`);
  console.log('📸 Screenshots guardados:\n');
  console.log('  - debug-screenshot-1-initial.png');
  console.log('  - debug-screenshot-2-signup-form.png');
  console.log('  - debug-screenshot-3-form-filled.png');
  console.log('  - debug-screenshot-4-after-submit.png');
  console.log('\n');

  // Resumen de API Keys detectadas
  console.log('='.repeat(80));
  console.log('🔑 API KEYS DETECTADAS EN REQUESTS');
  console.log('='.repeat(80));

  networkRequests.forEach((req, idx) => {
    if (req.headers.apikey || req.headers.authorization) {
      console.log(`\nRequest #${idx + 1} a ${req.url}:`);
      if (req.headers.apikey) {
        const key = req.headers.apikey;
        console.log(`  apikey: ${key.substring(0, 20)}...${key.substring(key.length - 10)}`);
      }
      if (req.headers.authorization) {
        console.log(`  authorization: ${req.headers.authorization.substring(0, 30)}...`);
      }
    }
  });

  // Resumen de errores de Supabase
  console.log('\n' + '='.repeat(80));
  console.log('❌ ERRORES DE SUPABASE');
  console.log('='.repeat(80));

  networkResponses.forEach((res, idx) => {
    if (res.status >= 400) {
      console.log(`\nResponse #${idx + 1}:`);
      console.log(`  URL: ${res.url}`);
      console.log(`  Status: ${res.status} ${res.statusText}`);
      console.log(`  Body: ${res.body}`);
    }
  });

  console.log('\n');

  await browser.close();

  return report;
}

// Ejecutar
debugSignup()
  .then(report => {
    console.log('✅ Análisis completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
