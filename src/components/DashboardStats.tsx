import React, { useMemo } from 'react';

interface Consultation {
  id: string;
  created_at: string;
  motivation_score?: number;
  summary?: string;
}

interface DashboardStatsProps {
  consultations: Consultation[];
  language: 'es' | 'en';
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ consultations, language }) => {
  const stats = useMemo(() => {
    const total = consultations.length;

    // Calcular motivación promedio
    const motivationScores = consultations
      .map(c => c.motivation_score)
      .filter((score): score is number => score !== undefined);
    const avgMotivation = motivationScores.length > 0
      ? motivationScores.reduce((sum, score) => sum + score, 0) / motivationScores.length
      : 0;

    // Pacientes en riesgo (motivación <4)
    const atRisk = consultations.filter(c => (c.motivation_score || 0) < 4).length;

    // Consultas esta semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeek = consultations.filter(c => new Date(c.created_at) >= oneWeekAgo).length;

    // Sistemas críticos detectados (extraer del summary)
    let totalCriticalSystems = 0;
    consultations.forEach(c => {
      if (c.summary) {
        const systems = ['DIGESTIÓN', 'ENERGÍA', 'MENTE', 'HORMONAL', 'INMUNE', 'ESTRUCTURA'];
        systems.forEach(system => {
          const match = c.summary!.match(new RegExp(`${system}[\\s\\S]*?(\\d+)\\/10`, 'i'));
          if (match && match[1] && parseInt(match[1]) < 4) {
            totalCriticalSystems++;
          }
        });
      }
    });
    const avgCriticalSystems = total > 0 ? (totalCriticalSystems / total).toFixed(1) : '0';

    return {
      total,
      avgMotivation: avgMotivation.toFixed(1),
      atRisk,
      thisWeek,
      avgCriticalSystems
    };
  }, [consultations]);

  const getMotivationColor = (score: number) => {
    if (score >= 7) return 'from-green-500 to-green-600';
    if (score >= 4) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Total Pacientes */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium mb-1">
              {language === 'es' ? 'Total Pacientes' : 'Total Patients'}
            </p>
            <p className="text-4xl font-bold">{stats.total}</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            👥
          </div>
        </div>
      </div>

      {/* Motivación Promedio */}
      <div className={`bg-gradient-to-br ${getMotivationColor(parseFloat(stats.avgMotivation))} rounded-xl shadow-lg p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm font-medium mb-1">
              {language === 'es' ? 'Motivación Promedio' : 'Avg Motivation'}
            </p>
            <p className="text-4xl font-bold">{stats.avgMotivation}</p>
            <p className="text-xs text-white/80 mt-1">/10</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            📊
          </div>
        </div>
      </div>

      {/* Pacientes en Riesgo */}
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-sm font-medium mb-1">
              {language === 'es' ? 'En Riesgo' : 'At Risk'}
            </p>
            <p className="text-4xl font-bold">{stats.atRisk}</p>
            <p className="text-xs text-red-100 mt-1">
              {language === 'es' ? 'motivación <4' : 'motivation <4'}
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            ⚠️
          </div>
        </div>
      </div>

      {/* Consultas Esta Semana */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">
              {language === 'es' ? 'Esta Semana' : 'This Week'}
            </p>
            <p className="text-4xl font-bold">{stats.thisWeek}</p>
            <p className="text-xs text-blue-100 mt-1">
              {language === 'es' ? 'consultas' : 'consultations'}
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            📅
          </div>
        </div>
      </div>

      {/* Sistemas Críticos */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium mb-1">
              {language === 'es' ? 'Sistemas Críticos' : 'Critical Systems'}
            </p>
            <p className="text-4xl font-bold">{stats.avgCriticalSystems}</p>
            <p className="text-xs text-orange-100 mt-1">
              {language === 'es' ? 'promedio/paciente' : 'avg/patient'}
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            🔬
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
