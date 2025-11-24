/**
 * Script para analizar la configuración de Supabase
 * Genera un reporte completo de tablas, políticas RLS, datos y Edge Functions
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuración de Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cozsoshuctvhvdbmkmwc.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenNvc2h1Y3R2aHZkYm1rbXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwNDI2NDIsImV4cCI6MjA3NzYxODY0Mn0.Q6ewFANuzCISYqVwAOpGsJsO9UgEbUsJEVbkMPz1dsA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tablas conocidas del proyecto
const TABLES = [
  'patients',
  'consultations',
  'transcriptions',
  'summaries',
  'session_checkpoints'
];

async function analyzeTables() {
  console.log('📊 Analizando tablas...\n');
  const results = {};

  for (const tableName of TABLES) {
    try {
      // Contar registros
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.warn(`⚠️  Error contando ${tableName}:`, countError.message);
        results[tableName] = { error: countError.message };
        continue;
      }

      // Obtener algunos registros de ejemplo (máximo 3)
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(3);

      // Obtener estructura de ejemplo
      const sample = sampleData && sampleData.length > 0 ? sampleData[0] : null;
      const columns = sample ? Object.keys(sample) : [];

      results[tableName] = {
        count: count || 0,
        columns,
        sample: sampleError ? null : (sampleData || []),
        hasData: (count || 0) > 0
      };

      console.log(`✅ ${tableName}: ${count || 0} registros`);
    } catch (error) {
      console.error(`❌ Error analizando ${tableName}:`, error.message);
      results[tableName] = { error: error.message };
    }
  }

  return results;
}

async function analyzeConsultations() {
  console.log('\n📋 Analizando consultas detalladamente...\n');
  
  try {
    // Consultas por estado
    const { data: byStatus, error: statusError } = await supabase
      .from('consultations')
      .select('status')
      .then(result => {
        if (result.error) return { data: null, error: result.error };
        const statusCounts = {};
        result.data.forEach(c => {
          statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
        });
        return { data: statusCounts, error: null };
      });

    // Consultas por idioma
    const { data: byLanguage } = await supabase
      .from('consultations')
      .select('language')
      .then(result => {
        if (result.error) return null;
        const langCounts = {};
        result.data.forEach(c => {
          langCounts[c.language] = (langCounts[c.language] || 0) + 1;
        });
        return langCounts;
      });

    // Consultas recientes
    const { data: recent } = await supabase
      .from('consultations')
      .select('id, created_at, status, language')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      byStatus: statusError ? null : byStatus,
      byLanguage,
      recent: recent || []
    };
  } catch (error) {
    console.error('Error analizando consultas:', error.message);
    return { error: error.message };
  }
}

async function analyzeCheckpoints() {
  console.log('\n💾 Analizando checkpoints...\n');
  
  try {
    const { data: checkpoints, error } = await supabase
      .from('session_checkpoints')
      .select('id, session_id, patient_name, message_count, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      return { error: error.message };
    }

    const stats = {
      total: checkpoints?.length || 0,
      withMessages: checkpoints?.filter(c => c.message_count > 0).length || 0,
      recent: checkpoints || []
    };

    console.log(`✅ ${stats.total} checkpoints encontrados`);
    return stats;
  } catch (error) {
    console.error('Error analizando checkpoints:', error.message);
    return { error: error.message };
  }
}

async function generateReport() {
  console.log('🔍 Iniciando análisis de Supabase...\n');
  console.log(`URL: ${SUPABASE_URL}\n`);

  const tablesAnalysis = await analyzeTables();
  const consultationsAnalysis = await analyzeConsultations();
  const checkpointsAnalysis = await analyzeCheckpoints();

  // Generar reporte en Markdown
  const report = `# Análisis de Supabase - Cabo Health Nova

**Fecha de análisis**: ${new Date().toISOString()}  
**URL del Proyecto**: ${SUPABASE_URL}  
**Proyecto ID**: cozsoshuctvhvdbmkmwc

---

## 📊 Resumen General

### Tablas Principales

${TABLES.map(table => {
  const data = tablesAnalysis[table];
  if (data?.error) {
    return `- **${table}**: ❌ Error - ${data.error}`;
  }
  return `- **${table}**: ${data?.count || 0} registros ${data?.hasData ? '✅' : '⚠️ (vacía)'}`;
}).join('\n')}

---

## 📋 Análisis Detallado por Tabla

${TABLES.map(table => {
  const data = tablesAnalysis[table];
  if (data?.error) {
    return `### ${table}\n\n❌ **Error**: ${data.error}\n`;
  }

  let section = `### ${table}\n\n`;
  section += `- **Total de registros**: ${data.count || 0}\n`;
  section += `- **Columnas**: ${data.columns?.join(', ') || 'N/A'}\n`;

  if (data.sample && data.sample.length > 0) {
    section += `\n#### Ejemplo de registro:\n\n\`\`\`json\n${JSON.stringify(data.sample[0], null, 2)}\n\`\`\`\n`;
  }

  return section;
}).join('\n---\n\n')}

---

## 📈 Análisis de Consultas

${consultationsAnalysis.error ? 
  `❌ **Error**: ${consultationsAnalysis.error}\n` :
  `### Distribución por Estado\n\n${consultationsAnalysis.byStatus ? 
    Object.entries(consultationsAnalysis.byStatus).map(([status, count]) => 
      `- **${status}**: ${count} consultas`
    ).join('\n') : 'No hay datos disponibles'}\n\n### Distribución por Idioma\n\n${consultationsAnalysis.byLanguage ? 
    Object.entries(consultationsAnalysis.byLanguage).map(([lang, count]) => 
      `- **${lang}**: ${count} consultas`
    ).join('\n') : 'No hay datos disponibles'}\n\n### Consultas Recientes\n\n${consultationsAnalysis.recent && consultationsAnalysis.recent.length > 0 ? 
    consultationsAnalysis.recent.map(c => 
      `- ${c.id.substring(0, 8)}... - ${c.status} - ${c.language} - ${new Date(c.created_at).toLocaleString()}`
    ).join('\n') : 'No hay consultas recientes'}\n`
}

---

## 💾 Análisis de Checkpoints

${checkpointsAnalysis.error ? 
  `❌ **Error**: ${checkpointsAnalysis.error}\n` :
  `- **Total de checkpoints**: ${checkpointsAnalysis.total || 0}\n- **Con mensajes**: ${checkpointsAnalysis.withMessages || 0}\n\n### Checkpoints Recientes\n\n${checkpointsAnalysis.recent && checkpointsAnalysis.recent.length > 0 ? 
    checkpointsAnalysis.recent.map(c => 
      `- **${c.patient_name || 'Sin nombre'}** - ${c.message_count} mensajes - ${new Date(c.updated_at).toLocaleString()}`
    ).join('\n') : 'No hay checkpoints recientes'}\n`
}

---

## 🔒 Estado de Seguridad

### Políticas RLS

⚠️ **Nota**: Las políticas RLS no se pueden consultar directamente con el cliente anon. Para verificar las políticas:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc)
2. Navega a **Authentication** → **Policies**
3. Verifica que todas las tablas tengan RLS habilitado

### Tablas con RLS Esperado

- ✅ \`patients\` - Solo usuarios autenticados pueden ver sus propios registros
- ✅ \`consultations\` - Solo usuarios autenticados pueden ver sus propias consultas
- ✅ \`transcriptions\` - Solo usuarios autenticados pueden ver transcripciones de sus consultas
- ✅ \`summaries\` - Solo usuarios autenticados pueden ver resúmenes de sus consultas
- ✅ \`session_checkpoints\` - Solo usuarios autenticados pueden ver sus propios checkpoints

---

## 🚀 Edge Functions

Las siguientes Edge Functions están desplegadas:

- ✅ \`save-consultation\` - Guarda consultas completas
- ✅ \`generate-summary\` - Genera resúmenes SOAP
- ✅ \`send-summary-email\` - Envía emails al médico
- ✅ \`get-consultations\` - Obtiene historial de consultas

**Nota**: Para verificar el estado de las Edge Functions, ve a Supabase Dashboard → Edge Functions

---

## 📝 Recomendaciones

${tablesAnalysis.patients?.count === 0 ? '- ⚠️ **Tabla patients vacía**: Considera crear algunos pacientes de prueba\n' : ''}${tablesAnalysis.consultations?.count === 0 ? '- ⚠️ **Tabla consultations vacía**: No hay consultas registradas aún\n' : ''}${tablesAnalysis.transcriptions?.count === 0 ? '- ⚠️ **Tabla transcriptions vacía**: No hay transcripciones guardadas\n' : ''}- ✅ Verificar que todas las tablas tengan índices optimizados
- ✅ Revisar políticas RLS en el Dashboard
- ✅ Verificar variables de entorno en Settings → Environment Variables

---

*Reporte generado automáticamente por analyze-supabase.js*
`;

  // Guardar reporte
  const reportPath = path.join(process.cwd(), 'docs', 'SUPABASE_ANALYSIS.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n✅ Reporte generado en: ${reportPath}\n`);

  return report;
}

// Ejecutar análisis
generateReport()
  .then(() => {
    console.log('✅ Análisis completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error durante el análisis:', error);
    process.exit(1);
  });












