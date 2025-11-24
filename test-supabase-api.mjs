// Probar directamente la API de Supabase
const SUPABASE_URL = 'https://cozsoshuctvhvdbmkmwc.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';

console.log('\n========================================');
console.log('PRUEBA 1: Verificar Endpoint de Auth');
console.log('========================================\n');

try {
  const response1 = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    method: 'GET',
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  console.log('Status:', response1.status, response1.statusText);
  const data1 = await response1.text();
  console.log('Response:', data1.substring(0, 500));
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n========================================');
console.log('PRUEBA 2: Intentar Signup');
console.log('========================================\n');

try {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log('Email de prueba:', testEmail);
  console.log('Password:', testPassword);

  const response2 = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  console.log('\nStatus:', response2.status, response2.statusText);
  console.log('Headers:', Object.fromEntries(response2.headers));
  const data2 = await response2.text();
  console.log('Response:', data2);
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n========================================');
console.log('PRUEBA 3: Verificar Health Check');
console.log('========================================\n');

try {
  const response3 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  console.log('Status:', response3.status, response3.statusText);
  const data3 = await response3.text();
  console.log('Response:', data3.substring(0, 500));
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n');
