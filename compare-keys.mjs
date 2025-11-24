// Comparar las diferentes API keys
const keys = {
  'current_env': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA',
  'env_example': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA',
  'service_role': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA0MjY0MiwiZXhwIjoyMDc3NjE4NjQyfQ.8HAy0tbp6Teq8hFn0zeu6yku1TP_R03P3hoOMHItTOo'
};

function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token');
  }

  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  const signature = parts[2];

  return { header, payload, signature };
}

console.log('\n' + '='.repeat(80));
console.log('COMPARACIÓN DE API KEYS');
console.log('='.repeat(80) + '\n');

for (const [name, token] of Object.entries(keys)) {
  console.log(`\n${name.toUpperCase()}:`);
  console.log('-'.repeat(80));

  try {
    const decoded = decodeJWT(token);
    console.log('Role:', decoded.payload.role);
    console.log('Project Ref:', decoded.payload.ref);
    console.log('Issued At:', new Date(decoded.payload.iat * 1000).toISOString());
    console.log('Expires At:', new Date(decoded.payload.exp * 1000).toISOString());
    console.log('Is Expired?:', Date.now() > decoded.payload.exp * 1000 ? 'YES ❌' : 'NO ✅');
    console.log('Signature:', decoded.signature);
    console.log('\nFull Token:', token);
  } catch (error) {
    console.error('Error decodificando:', error.message);
  }
}

console.log('\n' + '='.repeat(80));
console.log('PRUEBA DE API KEYS');
console.log('='.repeat(80) + '\n');

const SUPABASE_URL = 'https://cozsoshuctvhvdbmkmwc.supabase.co';

for (const [name, apiKey] of Object.entries(keys)) {
  console.log(`\nProbando ${name}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log(`  Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      console.log(`  ✅ API KEY VÁLIDA!`);
      const data = await response.json();
      console.log(`  Settings:`, JSON.stringify(data, null, 2).substring(0, 200));
    } else {
      console.log(`  ❌ API KEY INVÁLIDA`);
      const error = await response.text();
      console.log(`  Error:`, error);
    }
  } catch (error) {
    console.error(`  ❌ Error:`, error.message);
  }
}

console.log('\n');
