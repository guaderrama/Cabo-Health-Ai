// Test completo del flujo de autenticación
const https = require('https');

const SUPABASE_URL = 'cozsoshuctvhvdbmkmwc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';

const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';

console.log('🔍 INICIANDO TEST COMPLETO DE AUTENTICACIÓN\n');
console.log(`📧 Email de prueba: ${testEmail}`);
console.log(`🔑 Password: ${testPassword}\n`);

// Test 1: SIGNUP
function testSignup() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: testEmail,
      password: testPassword
    });

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/auth/v1/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    };

    console.log('1️⃣ TEST SIGNUP...');

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(body);
          console.log('✅ SIGNUP EXITOSO');
          console.log(`   User ID: ${response.user.id}`);
          console.log(`   Email: ${response.user.email}\n`);
          resolve(response);
        } else {
          console.log('❌ SIGNUP FALLÓ');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${body}\n`);
          reject(new Error(body));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

// Test 2: LOGIN
function testLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: testEmail,
      password: testPassword
    });

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/auth/v1/token?grant_type=password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': ANON_KEY
      }
    };

    console.log('2️⃣ TEST LOGIN...');

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(body);
          console.log('✅ LOGIN EXITOSO');
          console.log(`   User ID: ${response.user.id}`);
          console.log(`   Email: ${response.user.email}`);
          console.log(`   Access Token: ${response.access_token.substring(0, 30)}...\n`);
          resolve(response);
        } else {
          console.log('❌ LOGIN FALLÓ');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${body}\n`);
          reject(new Error(body));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

// Test 3: GET SESSION
function testGetSession(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/auth/v1/user',
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    };

    console.log('3️⃣ TEST GET SESSION...');

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(body);
          console.log('✅ GET SESSION EXITOSO');
          console.log(`   User ID: ${response.id}`);
          console.log(`   Email: ${response.email}`);
          console.log(`   Role: ${response.role}\n`);
          resolve(response);
        } else {
          console.log('❌ GET SESSION FALLÓ');
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${body}\n`);
          reject(new Error(body));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

// Ejecutar todos los tests
async function runAllTests() {
  try {
    const signupResponse = await testSignup();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo

    const loginResponse = await testLogin();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo

    await testGetSession(loginResponse.access_token);

    console.log('═══════════════════════════════════════');
    console.log('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
    console.log('═══════════════════════════════════════');
    console.log('\n✅ Supabase Auth está funcionando correctamente');
    console.log('✅ El Anon Key es válido');
    console.log('✅ Signup, Login y Get Session funcionan\n');
    console.log('⚠️  Si la aplicación web sigue fallando:');
    console.log('   1. Limpia el caché del navegador completamente');
    console.log('   2. Usa modo incógnito (Ctrl+Shift+N)');
    console.log('   3. Prueba en otro navegador');
    console.log('\n🌐 URL de la aplicación: http://localhost:3005\n');

  } catch (error) {
    console.log('═══════════════════════════════════════');
    console.log('❌ ERROR EN LOS TESTS');
    console.log('═══════════════════════════════════════');
    console.error(error.message);
  }
}

runAllTests();
