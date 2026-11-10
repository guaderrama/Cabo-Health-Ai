/**
 * Script para agregar la columna empathy_score a la tabla consultations
 * Ejecutar con: node fix-empathy-score.mjs
 */

const SUPABASE_URL = 'https://cozsoshuctvhvdbmkmwc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixEmpathyScore() {
  console.log('🔧 Verificando si la columna empathy_score existe...\n');

  // Primero, intentar hacer un SELECT para ver si la columna existe
  const testResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/consultations?select=empathy_score&limit=1`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    }
  );

  if (testResponse.ok) {
    console.log('✅ La columna empathy_score YA EXISTE en la tabla consultations.');
    console.log('   No es necesario hacer cambios.');
    return;
  }

  const errorData = await testResponse.json();

  if (errorData.message && errorData.message.includes('empathy_score')) {
    console.log('❌ La columna empathy_score NO EXISTE.\n');
    console.log('📋 INSTRUCCIONES PARA AGREGARLA:\n');
    console.log('1. Abre este link en tu navegador:');
    console.log('   https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc/sql/new\n');
    console.log('2. Copia y pega este SQL:');
    console.log('   ─────────────────────────────────────────────────────');
    console.log('   ALTER TABLE consultations');
    console.log('   ADD COLUMN IF NOT EXISTS empathy_score NUMERIC(3,1);');
    console.log('   ─────────────────────────────────────────────────────\n');
    console.log('3. Haz clic en "Run" o presiona Ctrl+Enter\n');
    console.log('4. Deberías ver: "Success. No rows returned"\n');
    console.log('5. ¡Listo! Vuelve a probar la aplicación.');
  } else {
    console.log('Error inesperado:', errorData);
  }
}

fixEmpathyScore().catch(console.error);
