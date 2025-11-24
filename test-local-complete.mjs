import { chromium } from 'playwright';

async function testLocalComplete() {
  console.log('\n=== PRUEBA COMPLETA LOCAL - CABO HEALTH NOVA ===\n');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Capturar todas las solicitudes de red
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('supabase') || request.url().includes('gemini')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });

  // Capturar todas las respuestas
  const responses = [];
  page.on('response', async response => {
    if (response.url().includes('supabase') || response.url().includes('gemini')) {
      try {
        const body = await response.text();
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          body: body.substring(0, 500)
        });
      } catch (e) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          body: 'Unable to read body'
        });
      }
    }
  });

  // Capturar errores de consola
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  try {
    console.log('1. Navegando a https://localhost:3000...');
    await page.goto('https://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    console.log('2. Esperando a que cargue la aplicación...');
    await page.waitForTimeout(3000);

    console.log('3. Tomando screenshot inicial...');
    await page.screenshot({ path: 'test-local-01-inicio.png', fullPage: true });

    // Verificar HTTPS
    const protocol = await page.evaluate(() => window.location.protocol);
    console.log('\n✓ Protocolo:', protocol);
    console.log(protocol === 'https:' ? '✅ HTTPS ACTIVO' : '❌ NO ES HTTPS');

    // Verificar acceso al micrófono
    console.log('\n4. Verificando acceso al micrófono...');
    const micTest = await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return { success: true, message: 'Micrófono accesible' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (micTest.success) {
      console.log('✅ MICRÓFONO:', micTest.message);
    } else {
      console.log('❌ MICRÓFONO:', micTest.error);
    }

    // Verificar variables de entorno en el código
    console.log('\n5. Verificando variables de entorno inyectadas...');
    const envCheck = await page.evaluate(() => {
      // Intentar acceder a las variables de múltiples formas
      const checkImportMeta = () => {
        try {
          return {
            geminiKey: import.meta.env?.VITE_GEMINI_API_KEY || null,
            supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || null,
            supabaseKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || null
          };
        } catch (e) {
          return null;
        }
      };

      // Verificar en window
      const checkWindow = () => {
        return {
          geminiKey: window.VITE_GEMINI_API_KEY || null,
          supabaseUrl: window.VITE_SUPABASE_URL || null,
          supabaseKey: window.VITE_SUPABASE_ANON_KEY || null
        };
      };

      const importMetaResult = checkImportMeta();
      const windowResult = checkWindow();

      return {
        fromImportMeta: importMetaResult,
        fromWindow: windowResult
      };
    });

    console.log('\nVariables de entorno detectadas:');
    console.log('Desde import.meta:', envCheck.fromImportMeta);
    console.log('Desde window:', envCheck.fromWindow);

    // Usar la que esté disponible
    const geminiKey = envCheck.fromImportMeta?.geminiKey || envCheck.fromWindow?.geminiKey;
    const supabaseUrl = envCheck.fromImportMeta?.supabaseUrl || envCheck.fromWindow?.supabaseUrl;
    const supabaseKey = envCheck.fromImportMeta?.supabaseKey || envCheck.fromWindow?.supabaseKey;

    console.log('\nGEMINI_API_KEY:', geminiKey ? geminiKey.substring(0, 20) + '...' : '❌ NO ENCONTRADA');
    console.log('SUPABASE_URL:', supabaseUrl || '❌ NO ENCONTRADA');
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? supabaseKey.substring(0, 30) + '...' : '❌ NO ENCONTRADA');

    // Verificar si la key correcta está presente
    const correctGeminiKey = 'AIzaSyAF3QzERye3p8dEneGKzToCCv-nxD81XTA';
    const correctSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';

    if (geminiKey === correctGeminiKey) {
      console.log('✅ Gemini API Key CORRECTA');
    } else {
      console.log('❌ Gemini API Key INCORRECTA o no inyectada');
    }

    if (supabaseKey === correctSupabaseKey) {
      console.log('✅ Supabase Anon Key CORRECTA');
    } else {
      console.log('❌ Supabase Anon Key INCORRECTA o no inyectada');
    }

    // Intentar registro
    console.log('\n6. Intentando registro de usuario...');

    // Esperar a que aparezca el botón de registro
    const registerButtonVisible = await page.isVisible('text=Registrarse').catch(() => false);

    if (registerButtonVisible) {
      console.log('✓ Botón de registro encontrado');

      // Generar email único con timestamp
      const timestamp = Date.now();
      const testEmail = `test-${timestamp}@cabosaludnova.com`;
      const testPassword = 'TestPassword123!';

      console.log(`\n7. Llenando formulario de registro...`);
      console.log('Email:', testEmail);

      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);

      await page.screenshot({ path: 'test-local-02-formulario-llenado.png', fullPage: true });

      console.log('\n8. Enviando formulario de registro...');
      await page.click('button:has-text("Registrarse")');

      // Esperar respuesta de Supabase
      console.log('9. Esperando respuesta de Supabase...');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'test-local-03-despues-registro.png', fullPage: true });

    } else {
      console.log('❌ No se encontró el formulario de registro en la página');
    }

    // Mostrar solicitudes y respuestas capturadas
    console.log('\n=== SOLICITUDES DE RED CAPTURADAS ===\n');
    if (requests.length > 0) {
      requests.forEach((req, i) => {
        console.log(`Solicitud ${i + 1}:`);
        console.log('  URL:', req.url);
        console.log('  Método:', req.method);
        console.log('  Authorization:', req.headers['authorization'] ? req.headers['authorization'].substring(0, 50) + '...' : 'No presente');
        console.log('  apikey:', req.headers['apikey'] ? req.headers['apikey'].substring(0, 50) + '...' : 'No presente');
        console.log('');
      });
    } else {
      console.log('⚠️  No se capturaron solicitudes a Supabase/Gemini');
    }

    console.log('\n=== RESPUESTAS DE RED CAPTURADAS ===\n');
    if (responses.length > 0) {
      responses.forEach((res, i) => {
        console.log(`Respuesta ${i + 1}:`);
        console.log('  URL:', res.url);
        console.log('  Status:', res.status, res.statusText);
        if (res.status === 401) {
          console.log('  ❌ ERROR: 401 - API key inválida');
        } else if (res.status === 200) {
          console.log('  ✅ ÉXITO: 200 - Solicitud exitosa');
        }
        console.log('  Body:', res.body);
        console.log('');
      });
    } else {
      console.log('⚠️  No se capturaron respuestas de Supabase/Gemini');
    }

    // Mostrar mensajes de consola
    console.log('\n=== MENSAJES DE CONSOLA ===\n');
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
    const warningMessages = consoleMessages.filter(msg => msg.type === 'warning');

    if (errorMessages.length > 0) {
      console.log('❌ ERRORES:');
      errorMessages.forEach(msg => console.log('  ', msg.text));
    }

    if (warningMessages.length > 0) {
      console.log('\n⚠️  ADVERTENCIAS:');
      warningMessages.forEach(msg => console.log('  ', msg.text));
    }

    // Resumen final
    console.log('\n=== RESUMEN FINAL ===\n');
    console.log('HTTPS:', protocol === 'https:' ? '✅' : '❌');
    console.log('Micrófono:', micTest.success ? '✅' : '❌');
    console.log('Gemini Key:', geminiKey === correctGeminiKey ? '✅' : '❌');
    console.log('Supabase Key:', supabaseKey === correctSupabaseKey ? '✅' : '❌');

    const hasSuccessfulAuth = responses.some(r => r.url.includes('supabase') && r.status === 200);
    const hasFailedAuth = responses.some(r => r.url.includes('supabase') && r.status === 401);

    console.log('Autenticación Supabase:', hasSuccessfulAuth ? '✅' : (hasFailedAuth ? '❌ (401)' : '⚠️  (No probada)'));

    console.log('\n10. Esperando 5 segundos antes de cerrar...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ ERROR durante la prueba:', error.message);
    await page.screenshot({ path: 'test-local-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testLocalComplete().catch(console.error);
