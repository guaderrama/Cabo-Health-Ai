import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Cargar .env
config();

console.log('\n=== VERIFICACIÓN DE VARIABLES DE ENTORNO ===\n');

console.log('Variables en proceso:');
console.log('VITE_GEMINI_API_KEY:', process.env.VITE_GEMINI_API_KEY);
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY?.substring(0, 50) + '...');

console.log('\n.env file contents:');
const envContent = readFileSync('.env', 'utf-8');
console.log(envContent);

console.log('\n=== VERIFICACIÓN DE CÓDIGO FUENTE ===\n');

// Verificar src/lib/supabase.ts
const supabaseContent = readFileSync('src/lib/supabase.ts', 'utf-8');
console.log('src/lib/supabase.ts:');
console.log(supabaseContent);
