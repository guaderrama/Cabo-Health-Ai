import React, { useState, useMemo } from 'react';
import { type Language } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';

interface ClinicalSummaryViewProps {
  summaryHTML: string;
  language: Language;
}

type TabType = 'overview' | 'soap' | 'systems' | 'motivation' | 'plan';

interface ParsedSummary {
  alerts: Alert[];
  motivation: MotivationData;
  systems: SystemData[];
  completeness: number;
  duration: string;
  chiefComplaint: string;
  keyFindings: string[];
}

interface Alert {
  severity: 'critical' | 'warning' | 'info';
  text: string;
}

interface MotivationData {
  importance: number;
  confidence: number;
  readiness: number;
}

interface SystemData {
  name: string;
  score: number;
  status: 'critical' | 'moderate' | 'optimal';
}

// Parser para extraer datos estructurados del HTML
const parseSummaryHTML = (html: string): ParsedSummary => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extraer alertas críticas
  const alerts: Alert[] = [];
  // Buscar sección de alertas usando traversal manual (no querySelector con :contains)
  const headers = Array.from(doc.querySelectorAll('h2'));
  const alertSection = headers.find(h => h.textContent?.includes('ALERTAS URGENTES') || h.textContent?.includes('ALERTAS CRÍTICAS'));

  if (alertSection || html.includes('ALERTAS URGENTES') || html.includes('🔴')) {
    const alertText = doc.body.textContent || '';
    const alertMatches = alertText.matchAll(/⚠️\s*(.+?)(?=⚠️|💪|🔬|$)/g);
    for (const match of alertMatches) {
      if (match[1]) {
        alerts.push({
          severity: 'critical',
          text: match[1].trim()
        });
      }
    }
  }

  // Extraer scores de motivación - regex actualizado para coincidir con formato del prompt
  // El prompt usa: "Importancia del cambio: [X/10]", "Confianza en cambiar: [X/10]", "Readiness general: [X/10]"
  const motivation: MotivationData = {
    importance: extractScore(html, /Importancia(?:\s+del\s+cambio)?[:\s]+\[?(\d+)\/10/i),
    confidence: extractScore(html, /Confianza(?:\s+en\s+cambiar)?[:\s]+\[?(\d+)\/10/i),
    readiness: extractScore(html, /Readiness(?:\s+general)?[:\s]+\[?(\d+)\/10/i)
  };

  // Extraer sistemas
  const systems: SystemData[] = [];
  const systemNames = ['DIGESTIÓN', 'ENERGÍA', 'MENTE', 'HORMONAL', 'INMUNE', 'ESTRUCTURA'];
  systemNames.forEach(name => {
    const match = html.match(new RegExp(`${name}[\\s\\S]*?(\\d+)\\/10`, 'i'));
    if (match && match[1]) {
      const score = parseInt(match[1]);
      systems.push({
        name,
        score,
        status: score >= 7 ? 'optimal' : score >= 4 ? 'moderate' : 'critical'
      });
    }
  });

  // Extraer completitud
  const completenessMatch = html.match(/Áreas Completamente Cubiertas:\s*(\d+)\/20/i);
  const completeness = completenessMatch && completenessMatch[1] ? parseInt(completenessMatch[1]) : 0;

  // Extraer duración
  const durationMatch = html.match(/⏱️ Duración[:\s]+~?(\d+ min)/i) || html.match(/Duración[:\s]+(.+?)(?=<|$)/i);
  const duration = durationMatch && durationMatch[1] ? durationMatch[1].trim() : 'N/A';

  // Extraer motivo principal
  const chiefComplaintMatch = html.match(/Motivo principal de consulta:[:\s]+(.+?)(?=Objetivos|<|$)/i);
  const chiefComplaint = chiefComplaintMatch && chiefComplaintMatch[1] ? chiefComplaintMatch[1].trim() : '';

  // Extraer hallazgos clave (del Resumen Ejecutivo)
  // Función para limpiar HTML tags y entidades
  const stripHtml = (text: string): string => {
    return text
      .replace(/<[^>]*>/g, ' ')           // Eliminar tags HTML
      .replace(/&nbsp;/g, ' ')            // Reemplazar &nbsp;
      .replace(/&amp;/g, '&')             // Decodificar &amp;
      .replace(/&lt;/g, '<')              // Decodificar &lt;
      .replace(/&gt;/g, '>')              // Decodificar &gt;
      .replace(/&quot;/g, '"')            // Decodificar &quot;
      .replace(/&#39;/g, "'")             // Decodificar &#39;
      .replace(/\s+/g, ' ')               // Normalizar espacios múltiples
      .trim();
  };

  const keyFindings: string[] = [];
  // Buscar en la sección de Resumen Ejecutivo específicamente
  const executiveSummaryMatch = html.match(/Resumen Ejecutivo[\s\S]*?(?=🎯 Análisis|💪 Motivación|🔬 Matriz|$)/i);
  const summarySection = executiveSummaryMatch ? executiveSummaryMatch[0] : html;

  // Buscar hallazgos numerados (1. texto, 2. texto, etc.)
  const findingsMatches = summarySection.matchAll(/(?:^|\n|<li>|<p>)\s*(\d+)[.\)]\s*(.+?)(?=(?:\n|<\/li>|<\/p>)\s*\d+[.\)]|💪|🔬|📋|🎯|<\/ul>|<\/ol>|$)/gis);
  let count = 0;
  for (const match of findingsMatches) {
    if (count < 5 && match[2]) {
      const cleanedFinding = stripHtml(match[2]).substring(0, 200);
      // Filtrar hallazgos muy cortos o que sean solo HTML residual
      if (cleanedFinding.length > 20 && !cleanedFinding.match(/^[\s\d.,;:]+$/)) {
        keyFindings.push(cleanedFinding);
        count++;
      }
    }
  }

  return { alerts, motivation, systems, completeness, duration, chiefComplaint, keyFindings };
};

const extractScore = (html: string, regex: RegExp): number => {
  const match = html.match(regex);
  return match && match[1] ? parseInt(match[1]) : 0;
};

const ClinicalSummaryView: React.FC<ClinicalSummaryViewProps> = ({ summaryHTML, language }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Parsear resumen
  const parsed = useMemo(() => parseSummaryHTML(summaryHTML), [summaryHTML]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: language === 'es' ? 'Vista Rápida' : 'Quick View', icon: '⚡' },
    { id: 'soap', label: 'SOAP', icon: '📋' },
    { id: 'systems', label: language === 'es' ? 'Sistemas' : 'Systems', icon: '🔬' },
    { id: 'motivation', label: language === 'es' ? 'Motivación' : 'Motivation', icon: '💪' },
    { id: 'plan', label: language === 'es' ? 'Plan' : 'Plan', icon: '🎯' }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 7) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500' };
    if (score >= 4) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500' };
  };

  const ProgressRing: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
    const radius = size / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 10) * circumference;
    const colors = getScoreColor(score);

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={score >= 7 ? 'text-green-500' : score >= 4 ? 'text-yellow-500' : 'text-red-500'}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${colors.text}`}>{score}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs Navigation */}
      <div className="flex gap-1 p-2 bg-slate-100 rounded-t-lg border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-purple-700 shadow-md ring-2 ring-purple-200'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hero Section - Motivo Principal */}
            {parsed.chiefComplaint && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-l-4 border-purple-500">
                <h3 className="text-sm font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                  {language === 'es' ? 'Motivo Principal' : 'Chief Complaint'}
                </h3>
                <p className="text-lg font-medium text-slate-800 leading-relaxed">{parsed.chiefComplaint}</p>
              </div>
            )}

            {/* Alertas Críticas */}
            {parsed.alerts.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-900">
                      {language === 'es' ? 'ALERTAS CRÍTICAS' : 'CRITICAL ALERTS'}
                    </h3>
                    <p className="text-sm text-red-700">
                      {language === 'es' ? 'Requiere atención inmediata' : 'Requires immediate attention'}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                      {parsed.alerts.length}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {parsed.alerts.map((alert, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-red-200">
                      <span className="text-red-600 mt-0.5">▪</span>
                      <p className="text-red-900 flex-1">{alert.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dashboard de Métricas Clave */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Motivación General */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700">
                    💪 {language === 'es' ? 'Motivación' : 'Motivation'}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    parsed.motivation.readiness >= 7 ? 'bg-green-100 text-green-700' :
                    parsed.motivation.readiness >= 4 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {parsed.motivation.readiness}/10
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{language === 'es' ? 'Importancia' : 'Importance'}</span>
                      <span className="font-semibold">{parsed.motivation.importance}/10</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${parsed.motivation.importance >= 7 ? 'bg-green-500' : parsed.motivation.importance >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${parsed.motivation.importance * 10}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{language === 'es' ? 'Confianza' : 'Confidence'}</span>
                      <span className="font-semibold">{parsed.motivation.confidence}/10</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${parsed.motivation.confidence >= 7 ? 'bg-green-500' : parsed.motivation.confidence >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${parsed.motivation.confidence * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Completitud */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700">
                    📊 {language === 'es' ? 'Completitud' : 'Completeness'}
                  </h4>
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {parsed.completeness}/20
                  </span>
                </div>
                <div className="flex items-center justify-center py-2">
                  <ProgressRing score={Math.round(parsed.completeness / 2)} size={70} />
                </div>
                <div className="text-center mt-2">
                  <p className="text-2xl font-bold text-slate-800">{Math.round((parsed.completeness / 20) * 100)}%</p>
                  <p className="text-xs text-slate-600">
                    {language === 'es' ? 'Áreas evaluadas' : 'Areas assessed'}
                  </p>
                </div>
              </div>

              {/* Duración */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700">
                    ⏱️ {language === 'es' ? 'Duración' : 'Duration'}
                  </h4>
                </div>
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-purple-700">{parsed.duration}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {language === 'es' ? 'de conversación' : 'of conversation'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Matriz de Sistemas - Vista Rápida */}
            {parsed.systems.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔬</span>
                  {language === 'es' ? 'Estado de Sistemas Corporales' : 'Body Systems Status'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parsed.systems.map((system, idx) => {
                    const colors = getScoreColor(system.score);
                    return (
                      <div key={idx} className={`${colors.bg} rounded-lg p-4 border-2 ${colors.ring} border-opacity-50`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-slate-700">{system.name}</span>
                          <span className={`text-2xl font-bold ${colors.text}`}>{system.score}/10</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className={`h-full ${system.score >= 7 ? 'bg-green-500' : system.score >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${system.score * 10}%` }}
                          />
                        </div>
                        <p className="text-xs mt-2 text-slate-600">
                          {system.status === 'optimal' ? '🟢 Óptimo' : system.status === 'moderate' ? '🟡 Moderado' : '🔴 Crítico'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hallazgos Clave */}
            {parsed.keyFindings.length > 0 && (
              <div className="bg-white border-2 border-blue-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  {language === 'es' ? 'Hallazgos Clave' : 'Key Findings'}
                </h3>
                <div className="space-y-3">
                  {parsed.keyFindings.map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {idx + 1}
                      </div>
                      <p className="text-slate-700 leading-relaxed flex-1">{finding}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Otras tabs muestran el contenido completo */}
        {activeTab === 'soap' && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryHTML.match(/🩺 Análisis Clínico[\s\S]*?(?=🎯 Análisis|$)/i)?.[0] || summaryHTML) }} />
          </div>
        )}

        {activeTab === 'systems' && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryHTML.match(/🔬 Matriz de Sistemas[\s\S]*?(?=📋 Resumen|$)/i)?.[0] || summaryHTML) }} />
          </div>
        )}

        {activeTab === 'motivation' && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryHTML.match(/🎯 Análisis de Motivación[\s\S]*?(?=✅ Checklist|$)/i)?.[0] || summaryHTML) }} />
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryHTML.match(/P - PLAN[\s\S]*?(?=🔬 Estudios|📆 Plan de seguimiento|$)/i)?.[0] || summaryHTML) }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalSummaryView;
