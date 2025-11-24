const https = require('https');

const API_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';

const email = `debug-${Date.now()}@example.com`;
const password = 'Password123!';

const useRedirect = process.argv.includes('--redirect');
const path = useRedirect
  ? '/auth/v1/signup?redirect_to=http%3A%2F%2Flocalhost%3A9000%2F'
  : '/auth/v1/signup';

const data = JSON.stringify({ email, password });

const options = {
  hostname: 'cozsoshuctvhvdbmkmwc.supabase.co',
  port: 443,
  path,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    'Content-Length': Buffer.byteLength(data),
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
console.log(`Path: ${path}`);
console.log('Status:', res.statusCode);
console.log('Body:', body);
  });
});

req.on('error', (err) => {
  console.error('Error:', err.message);
});

console.log('Payload:', data);
console.log('API Key length:', API_KEY.length);
req.write(data);
req.end();
