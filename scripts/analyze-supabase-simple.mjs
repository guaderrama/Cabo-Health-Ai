/**
 * Script simplificado para analizar Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://cozsoshuctvhvdbmkmwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES = ['patients', 'consultations', 'transcriptions', 'summaries', 'session_checkpoints'];

async function main() {
  console.log('🔍 Analizando Supabase...\n');
  console.log(`URL: ${SUPABASE_URL}\n`);

  const results = {};

  // Analizar cada tabla
  for (const table of TABLES) {
    try {
      console.log(`Analizando ${table}...`);
      
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`  ⚠️  Error: ${countError.message}`);
        results[table] = { count: 0, error: countError.message };
        continue;
      }

      const { data: sample, error: sampleError } = await supabase
        .from(table)
        .select('*')
        .limit(2);

      results[table] = {
        count: count || 0,
        sample: sampleError ? null : (sample || []),
        columns: sample && sample.length > 0 ? Object.keys(sample[0]) : []
      };

      console.log(`  ✅ ${count || 0} registros`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results[table] = { count: 0, error: error.message };
    }
  }

  // Análisis de consultas
  console.log('\n📊 Analizando consultas...');
  try {
    const { data: consultations, error } = await supabase
      .from('consultations')
      .select('status, language, created_at')
      .limit(100);

    if (!error && consultations) {
      const byStatus = {};
      const byLanguage = {};
      consultations.forEach(c => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
        byLanguage[c.language] = (byLanguage[c.language] || 0) + 1;
      });
      results.consultationsAnalysis = { byStatus, byLanguage };
      console.log(`  ✅ Estado:`, byStatus);
      console.log(`  ✅ Idioma:`, byLanguage);
    }
  } catch (error) {
    console.log(`  ⚠️  Error: ${error.message}`);
  }

  // Generar reporte
  const report = `# Análisis de Supabase - Cabo Health Nova

**Fecha**: ${new Date().toISOString()}  
**URL**: ${SUPABASE_URL}

## 📊 Resumen

${TABLES.map(t => {
  const r = results[t];
  return `- **${t}**: ${r?.count || 0} registros ${r?.error ? `(Error: ${r.error})` : ''}`;
}).join('\n')}

## 📋 Detalles

${TABLES.map(t => {
  const r = results[t];
  if (r?.error) return `### ${t}\n\n❌ Error: ${r.error}\n`;
  
  let section = `### ${t}\n\n`;
  section += `- **Total**: ${r?.count || 0}\n`;
  if (r?.columns?.length) section += `- **Columnas**: ${r.columns.join(', ')}\n`;
  if (r?.sample?.length) {
    section += `\n**Ejemplo**:\n\`\`\`json\n${JSON.stringify(r.sample[0], null, 2)}\n\`\`\`\n`;
  }
  return section;
}).join('\n---\n\n')}

${results.consultationsAnalysis ? `
## 📈 Análisis de Consultas

**Por Estado**: ${JSON.stringify(results.consultationsAnalysis.byStatus, null, 2)}  
**Por Idioma**: ${JSON.stringify(results.consultationsAnalysis.byLanguage, null, 2)}
` : ''}

---
*Generado automáticamente*
`;

  fs.writeFileSync('docs/SUPABASE_ANALYSIS.md', report, 'utf-8');
  console.log('\n✅ Reporte generado en docs/SUPABASE_ANALYSIS.md');
}

main().catch(console.error);




