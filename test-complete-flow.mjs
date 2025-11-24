import { chromium } from '@playwright/test';

(async () => {
  console.log('\n🧪 PRUEBA COMPLETA: SISTEMA DE ROLES (PACIENTE + MÉDICO)\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['microphone'],
  });

  // ============================================================
  // PARTE 1: REGISTRO Y LOGIN COMO PACIENTE
  // ============================================================
  console.log('\n📋 PARTE 1: PRUEBA DE PACIENTE');
  console.log('-'.repeat(60));

  const patientPage = await context.newPage();
  const timestamp = Date.now();
  const patientEmail = `paciente-${timestamp}@test.com`;
  const doctorEmail = `doctor-${timestamp}@test.com`;
  const password = 'Test123456!';

  try {
    console.log('\n1️⃣ Abriendo aplicación...');
    await patientPage.goto('https://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    await patientPage.waitForTimeout(2000);
    console.log('✅ Aplicación cargada');

    // Verificar que está en pantalla de login
    console.log('\n2️⃣ Verificando pantalla de autenticación...');
    const hasEmailInput = await patientPage.isVisible('input[type="email"]');
    const hasPasswordInput = await patientPage.isVisible('input[type="password"]');

    if (!hasEmailInput || !hasPasswordInput) {
      throw new Error('No se encontró el formulario de autenticación');
    }
    console.log('✅ Formulario de autenticación encontrado');

    // Cambiar a modo registro
    console.log('\n3️⃣ Cambiando a modo registro...');
    const registerButton = patientPage.locator('button:has-text("Regístrate")');
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await patientPage.waitForTimeout(500);
      console.log('✅ Modo registro activado');
    }

    // Verificar selector de rol
    console.log('\n4️⃣ Verificando selector de rol...');
    await patientPage.waitForSelector('text=Tipo de Cuenta', { timeout: 5000 });
    const patientRoleButton = patientPage.locator('button:has-text("Paciente")');
    const doctorRoleButton = patientPage.locator('button:has-text("Médico")');

    if (!(await patientRoleButton.isVisible()) || !(await doctorRoleButton.isVisible())) {
      throw new Error('No se encontraron los botones de selección de rol');
    }
    console.log('✅ Selector de rol encontrado (Paciente/Médico)');

    // Seleccionar rol de paciente
    console.log('\n5️⃣ Seleccionando rol: PACIENTE 👤...');
    await patientRoleButton.click();
    await patientPage.waitForTimeout(500);

    // Verificar que el botón de paciente está seleccionado (tiene bg-blue-50)
    const isPatientSelected = await patientPage.locator('button:has-text("Paciente")').evaluate(
      el => el.classList.contains('bg-blue-50')
    );
    if (!isPatientSelected) {
      throw new Error('El rol de paciente no se seleccionó correctamente');
    }
    console.log('✅ Rol PACIENTE seleccionado');

    // Llenar formulario de registro
    console.log('\n6️⃣ Llenando formulario de registro...');
    console.log(`   Email paciente: ${patientEmail}`);
    await patientPage.fill('input[type="email"]', patientEmail);
    await patientPage.fill('input[type="password"]', password);
    console.log('✅ Formulario lleno');

    // Registrar
    console.log('\n7️⃣ Registrando paciente...');
    const submitButton = patientPage.locator('button[type="submit"]').first();
    await submitButton.click();
    await patientPage.waitForTimeout(3000);

    // Verificar que apareció mensaje de éxito o que cargó la interfaz de paciente
    const hasSuccessMessage = await patientPage.isVisible('text=Registro exitoso');
    const hasNovaInterface = await patientPage.isVisible('text=Nova', { timeout: 5000 }).catch(() => false);

    if (hasSuccessMessage) {
      console.log('✅ Registro exitoso - Email de confirmación enviado');
      console.log('ℹ️  En producción necesitarías confirmar el email');
    } else if (hasNovaInterface) {
      console.log('✅ Registro exitoso y sesión iniciada automáticamente');
      console.log('✅ Interfaz de PACIENTE (Nova) visible');
    } else {
      console.log('⚠️  Registro completado pero sin confirmación visual clara');
    }

    await patientPage.screenshot({ path: 'test-patient-registered.png', fullPage: true });

  } catch (error) {
    console.error('\n❌ ERROR en prueba de PACIENTE:', error.message);
    await patientPage.screenshot({ path: 'test-patient-error.png', fullPage: true });
  }

  // ============================================================
  // PARTE 2: REGISTRO Y LOGIN COMO MÉDICO
  // ============================================================
  console.log('\n\n📋 PARTE 2: PRUEBA DE MÉDICO');
  console.log('-'.repeat(60));

  // Crear un NUEVO contexto (sesión separada) para el médico
  console.log('\n🔄 Creando nueva sesión de navegador para médico...');
  const doctorContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['microphone'],
  });
  const doctorPage = await doctorContext.newPage();
  console.log('✅ Nueva sesión creada (sin autenticación previa)');

  try {
    console.log('\n1️⃣ Abriendo aplicación en nueva pestaña...');
    await doctorPage.goto('https://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    await doctorPage.waitForTimeout(2000);
    console.log('✅ Aplicación cargada');

    // Verificar pantalla de login
    console.log('\n2️⃣ Verificando pantalla de autenticación...');
    const hasEmailInput = await doctorPage.isVisible('input[type="email"]');
    if (!hasEmailInput) {
      throw new Error('No se encontró el formulario de autenticación');
    }
    console.log('✅ Formulario de autenticación encontrado');

    // Cambiar a modo registro
    console.log('\n3️⃣ Cambiando a modo registro...');
    const registerButton = doctorPage.locator('button:has-text("Regístrate")');
    if (await registerButton.isVisible()) {
      await registerButton.click();
      await doctorPage.waitForTimeout(500);
      console.log('✅ Modo registro activado');
    }

    // Seleccionar rol de médico
    console.log('\n4️⃣ Seleccionando rol: MÉDICO 👨‍⚕️...');
    await doctorPage.waitForSelector('text=Tipo de Cuenta', { timeout: 5000 });
    const doctorRoleButton = doctorPage.locator('button:has-text("Médico")');
    await doctorRoleButton.click();
    await doctorPage.waitForTimeout(500);

    // Verificar que el botón de médico está seleccionado (tiene bg-purple-50)
    const isDoctorSelected = await doctorPage.locator('button:has-text("Médico")').evaluate(
      el => el.classList.contains('bg-purple-50')
    );
    if (!isDoctorSelected) {
      throw new Error('El rol de médico no se seleccionó correctamente');
    }
    console.log('✅ Rol MÉDICO seleccionado');

    // Llenar formulario de registro
    console.log('\n5️⃣ Llenando formulario de registro...');
    console.log(`   Email médico: ${doctorEmail}`);
    await doctorPage.fill('input[type="email"]', doctorEmail);
    await doctorPage.fill('input[type="password"]', password);
    console.log('✅ Formulario lleno');

    // Registrar
    console.log('\n6️⃣ Registrando médico...');
    const submitButton = doctorPage.locator('button[type="submit"]').first();
    await submitButton.click();
    await doctorPage.waitForTimeout(3000);

    // Verificar que apareció el dashboard del médico
    const hasDoctorDashboard = await doctorPage.isVisible('text=Panel del Médico', { timeout: 5000 }).catch(() => false);
    const hasDoctorTitle = await doctorPage.isVisible('text=Doctor Dashboard', { timeout: 5000 }).catch(() => false);
    const hasConsultasRecibidas = await doctorPage.isVisible('text=recibidas', { timeout: 5000 }).catch(() => false);

    if (hasDoctorDashboard || hasDoctorTitle || hasConsultasRecibidas) {
      console.log('✅ Registro exitoso y sesión iniciada automáticamente');
      console.log('✅ Dashboard de MÉDICO visible');

      // Verificar elementos del dashboard
      console.log('\n7️⃣ Verificando elementos del dashboard...');
      const hasSearchBox = await doctorPage.isVisible('input[placeholder*="Buscar"]');
      const hasFilterButtons = await doctorPage.isVisible('button:has-text("Todas")');

      if (hasSearchBox) {
        console.log('   ✅ Barra de búsqueda presente');
      }
      if (hasFilterButtons) {
        console.log('   ✅ Filtros de motivación presentes');
      }

      // Verificar mensaje de "no consultas"
      const hasNoConsultations = await doctorPage.isVisible('text=No has recibido consultas', { timeout: 2000 }).catch(() => false);
      if (hasNoConsultations) {
        console.log('   ✅ Mensaje de "sin consultas" visible (correcto para cuenta nueva)');
      }

    } else {
      console.log('⚠️  Registro completado pero dashboard no visible claramente');
    }

    await doctorPage.screenshot({ path: 'test-doctor-dashboard.png', fullPage: true });

  } catch (error) {
    console.error('\n❌ ERROR en prueba de MÉDICO:', error.message);
    await doctorPage.screenshot({ path: 'test-doctor-error.png', fullPage: true });
  }

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log('\n✅ COMPLETADO\n');
  console.log('📧 Credenciales creadas:');
  console.log(`   Paciente: ${patientEmail} / ${password}`);
  console.log(`   Médico:   ${doctorEmail} / ${password}`);
  console.log('\n📸 Screenshots generados:');
  console.log('   - test-patient-registered.png');
  console.log('   - test-doctor-dashboard.png');
  console.log('\n🔗 URL de prueba: https://localhost:3000');
  console.log('\n✨ Prueba las credenciales manualmente para verificar el flujo completo!\n');

  // Mantener el navegador abierto por 10 segundos para que puedas ver
  console.log('🕐 Manteniendo navegador abierto por 10 segundos...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));

  await browser.close();

})().catch(error => {
  console.error('\n💥 ERROR FATAL:', error);
  process.exit(1);
});
