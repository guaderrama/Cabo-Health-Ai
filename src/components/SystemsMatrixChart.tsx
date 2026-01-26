import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SystemScore {
  system: string;
  score: number;
  fullMark: number;
}

interface SystemsMatrixChartProps {
  summaryHTML: string;
}

const SystemsMatrixChart: React.FC<SystemsMatrixChartProps> = ({ summaryHTML }) => {
  // Extraer datos de sistemas del HTML del resumen
  const systemsData = useMemo(() => {
    const defaultSystems: SystemScore[] = [
      { system: 'DIGESTIÓN', score: 5, fullMark: 10 },
      { system: 'ENERGÍA', score: 5, fullMark: 10 },
      { system: 'MENTE', score: 5, fullMark: 10 },
      { system: 'HORMONAL', score: 5, fullMark: 10 },
      { system: 'INMUNE', score: 5, fullMark: 10 },
      { system: 'ESTRUCTURA', score: 5, fullMark: 10 },
    ];

    if (!summaryHTML) return defaultSystems;

    try {
      // Parsear el HTML para extraer las puntuaciones de sistemas
      const parser = new DOMParser();
      const doc = parser.parseFromString(summaryHTML, 'text/html');

      // Función para extraer score de un texto
      const extractSystemScore = (text: string, systemName: string): number | null => {
        const patterns = [
          new RegExp(`${systemName}[:\\s]+(?:\\[)?(\\d+)\\/10`, 'i'),
          new RegExp(`${systemName}.{0,150}?(\\d+)\\s*\\/\\s*10`, 'i'),
          new RegExp(`${systemName}[^\\d]{0,200}\\[(\\d+)\\/10\\]`, 'i'),
          new RegExp(`${systemName}[^0-9]{0,100}(\\d+)\\s*\\/\\s*10`, 'i'),
          new RegExp(`(\\d+)\\s*\\/\\s*10[^\\d]{0,50}${systemName}`, 'i'),
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match?.[1]) {
            const score = parseInt(match[1]);
            if (score >= 0 && score <= 10) {
              return score;
            }
          }
        }
        return null;
      };

      // Buscar sección de Matriz de Sistemas
      const systemsSection = doc.querySelector('.systems-matrix, .matriz-sistemas');

      // Usar el texto de la sección si existe, o el documento completo
      const textSource = systemsSection ? systemsSection.textContent || '' : doc.body.textContent || '';
      const rawHTML = summaryHTML || '';

      // Extraer scores del texto
      const digestScore = extractSystemScore(textSource, 'DIGESTIÓN') ?? extractSystemScore(textSource, 'DIGESTION') ?? extractSystemScore(rawHTML, 'DIGESTIÓN') ?? extractSystemScore(rawHTML, 'DIGESTION');
      const energyScore = extractSystemScore(textSource, 'ENERGÍA') ?? extractSystemScore(textSource, 'ENERGIA') ?? extractSystemScore(rawHTML, 'ENERGÍA') ?? extractSystemScore(rawHTML, 'ENERGIA');
      const mindScore = extractSystemScore(textSource, 'MENTE') ?? extractSystemScore(rawHTML, 'MENTE');
      const hormonalScore = extractSystemScore(textSource, 'HORMONAL') ?? extractSystemScore(rawHTML, 'HORMONAL');
      const immuneScore = extractSystemScore(textSource, 'INMUNE') ?? extractSystemScore(rawHTML, 'INMUNE');
      const structureScore = extractSystemScore(textSource, 'ESTRUCTURA') ?? extractSystemScore(rawHTML, 'ESTRUCTURA');

      // Retornar si encontramos al menos un sistema válido
      if (digestScore !== null || energyScore !== null || mindScore !== null ||
          hormonalScore !== null || immuneScore !== null || structureScore !== null) {
        return [
          { system: 'DIGESTIÓN', score: digestScore ?? 5, fullMark: 10 },
          { system: 'ENERGÍA', score: energyScore ?? 5, fullMark: 10 },
          { system: 'MENTE', score: mindScore ?? 5, fullMark: 10 },
          { system: 'HORMONAL', score: hormonalScore ?? 5, fullMark: 10 },
          { system: 'INMUNE', score: immuneScore ?? 5, fullMark: 10 },
          { system: 'ESTRUCTURA', score: structureScore ?? 5, fullMark: 10 },
        ];
      }
    } catch (error) {
      console.error('Error parsing systems data:', error);
    }

    return defaultSystems;
  }, [summaryHTML]);

  // Detectar si tenemos datos reales o solo valores por defecto
  const hasRealData = useMemo(() => {
    // Si todos los scores son exactamente 5, probablemente son valores por defecto
    const allDefaultValues = systemsData.every(s => s.score === 5);
    return !allDefaultValues;
  }, [systemsData]);

  // Calcular promedio
  const averageScore = useMemo(() => {
    if (systemsData.length === 0) return '0.0';
    const total = systemsData.reduce((sum, system) => sum + system.score, 0);
    return (total / systemsData.length).toFixed(1);
  }, [systemsData]);

  // Obtener color basado en puntuación
  const getScoreColor = (score: number) => {
    if (score >= 7) return '#10b981'; // green-500
    if (score >= 4) return '#f59e0b'; // yellow-500
    return '#ef4444'; // red-500
  };

  // Obtener color del sistema
  const getSystemColor = (systemName: string) => {
    const colors: Record<string, string> = {
      'DIGESTIÓN': '#3b82f6', // blue-500
      'ENERGÍA': '#f59e0b', // yellow-500
      'MENTE': '#8b5cf6', // purple-500
      'HORMONAL': '#ec4899', // pink-500
      'INMUNE': '#10b981', // green-500
      'ESTRUCTURA': '#6366f1', // indigo-500
    };
    return colors[systemName] || '#64748b';
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span className="text-2xl">🔬</span>
          Matriz de Sistemas - Visualización
        </h3>
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-800">{averageScore}</div>
          <div className="text-xs text-slate-600">Promedio</div>
        </div>
      </div>

      {/* Aviso si no hay datos reales */}
      {!hasRealData && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <span className="text-amber-500 text-xl">⚠️</span>
          <p className="text-amber-700 text-sm">
            <strong>Datos no disponibles:</strong> Esta consulta fue realizada antes de la actualización.
            Las nuevas consultas mostrarán puntuaciones reales para cada sistema.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spider/Radar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={systemsData}>
              <PolarGrid stroke="#e2e8f0" strokeWidth={1.5} />
              <PolarAngleAxis
                dataKey="system"
                tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickCount={6}
              />
              <Radar
                name="Puntuación"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.5}
                strokeWidth={3}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                formatter={(value: number) => [`${value}/10`, 'Puntuación']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* System Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          {systemsData.map((system) => (
            <div
              key={system.system}
              className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  {system.system}
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: getScoreColor(system.score) }}
                >
                  {system.score}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(system.score / 10) * 100}%`,
                    backgroundColor: getSystemColor(system.system)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-slate-600">Óptimo (≥7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-slate-600">Moderado (4-6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-slate-600">Crítico (&lt;4)</span>
        </div>
      </div>
    </div>
  );
};

export default SystemsMatrixChart;
