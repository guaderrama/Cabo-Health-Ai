// Decodificar JWT token
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA";

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

const decoded = decodeJWT(token);

console.log('\n========================================');
console.log('JWT TOKEN DECODIFICADO');
console.log('========================================\n');

console.log('Header:');
console.log(JSON.stringify(decoded.header, null, 2));

console.log('\nPayload:');
console.log(JSON.stringify(decoded.payload, null, 2));

console.log('\nSignature:', decoded.signature);

console.log('\n========================================');
console.log('ANÁLISIS');
console.log('========================================\n');

console.log('Project Ref:', decoded.payload.ref);
console.log('Role:', decoded.payload.role);
console.log('Issued At:', new Date(decoded.payload.iat * 1000).toISOString());
console.log('Expires At:', new Date(decoded.payload.exp * 1000).toISOString());
console.log('Is Expired?:', Date.now() > decoded.payload.exp * 1000 ? 'YES' : 'NO');

console.log('\n');
