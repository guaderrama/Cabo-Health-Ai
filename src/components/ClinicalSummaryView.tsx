import React, { useState, useMemo } from 'react';
import { type Language } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import { logger } from '../lib/logger';
import { extractScoresFromSummary } from '../utils/consultation';

interface ClinicalSummaryViewProps {
  summaryHTML: string;
  language: Language;
}

type TabType = 'overview' | 'soap' | 'systems' | 'motivation' | 'plan';

interface AdherencePrognosis {
  level: 'ideal' | 'reservations' | 'not-candidate' | 'unknown';
  reason: string;
  recommendation: string;
  barriers: string[];
  redFlags: string[];
}

interface ParsedSummary {
  alerts: Alert[];
  motivation: MotivationData;
  systems: SystemData[];
  completeness: number;
  duration: string;
  chiefComplaint: string;
  keyFindings: string[];
  adherencePrognosis: AdherencePrognosis;
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

  // Obtener texto plano del HTML para búsquedas más flexibles
  const plainText = doc.body.textContent || '';

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

  // Extraer scores de motivación usando función centralizada (scoped a sección correcta)
  const centralScores = extractScoresFromSummary(html);
  const motivation: MotivationData = {
    importance: centralScores.importance ?? 0,
    confidence: centralScores.confidence ?? 0,
    readiness: centralScores.readiness ?? 0,
  };

  // Extraer sistemas - buscar SOLO dentro de la sección Systems Matrix
  // para evitar que "energy" en texto corrido matchee con scores del dashboard
  const systems: SystemData[] = [];
  const systemsSection = html.match(/Systems Matrix[\s\S]*?(?=Executive Summary|Análisis Clínico|Clinical Analysis|📋|🩺|$)/i)?.[0] || '';
  const systemNamesMap: [string, string][] = [
    ['DIGESTIÓN', 'DIGESTION'], ['ENERGÍA', 'ENERGY'], ['MENTE', 'MIND'],
    ['HORMONAL', 'HORMONAL'], ['INMUNE', 'IMMUNE'], ['ESTRUCTURA', 'STRUCTURE']
  ];
  systemNamesMap.forEach(([es, en]) => {
    // Search within systems section only, using heading context (emoji + name)
    const pattern = new RegExp(`(?:🍽️|⚡|🧠|🔬|🛡️|🏃)?\\s*(?:${es}|${en})[\\s\\S]*?(\\d+)\\s*\\/\\s*10`, 'i');
    const match = systemsSection.match(pattern);
    if (match && match[1]) {
      const score = parseInt(match[1]);
      const displayName = systemsSection.includes(en) ? en : es;
      systems.push({
        name: displayName,
        score,
        status: score >= 7 ? 'optimal' : score >= 4 ? 'moderate' : 'critical'
      });
    }
  });

  // Extraer completitud - buscar en texto plano y HTML
  // Formato esperado: "Áreas Completamente Cubiertas: 18/20" o "<div>📋 Completitud</div><div>18/20</div>"
  let completeness = 0;
  const completenessPatterns = [
    /Áreas Completamente Cubiertas[:\s]*(\d+)\/20/i,
    /Completitud[^0-9]{0,30}(\d+)\/20/i,
    /(\d+)\/20[^0-9]{0,20}Áreas/i,
  ];
  for (const pattern of completenessPatterns) {
    const match = plainText.match(pattern) || html.match(pattern);
    if (match?.[1]) {
      completeness = parseInt(match[1]);
      break;
    }
  }

  // Extraer duración - buscar en texto plano
  // Formato esperado: "~15 min" o "⏱️ Duración Entrevista ~15 min"
  let duration = 'N/A';
  const durationPatterns = [
    /Duración[^0-9]*~?(\d+)\s*min/i,
    /~(\d+)\s*min/i,
    /(\d+)\s*minutos?/i,
  ];
  for (const pattern of durationPatterns) {
    const match = plainText.match(pattern);
    if (match?.[1]) {
      duration = `~${match[1]} min`;
      break;
    }
  }

  // Extraer motivo principal
  const chiefComplaintMatch = html.match(/(?:Motivo principal de consulta|Primary reason for consultation)[:\s]+(.+?)(?=Objetivos|Patient|<|$)/i);
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

  // Extraer pronóstico de adherencia
  const adherencePrognosis: AdherencePrognosis = {
    level: 'unknown',
    reason: '',
    recommendation: '',
    barriers: [],
    redFlags: []
  };

  // Detectar nivel de pronóstico (busca emojis y keywords)
  if (plainText.includes('CANDIDATO IDEAL') || plainText.includes('IDEAL CANDIDATE')) {
    adherencePrognosis.level = 'ideal';
  } else if (plainText.includes('CON RESERVAS') || plainText.includes('WITH RESERVATIONS')) {
    adherencePrognosis.level = 'reservations';
  } else if (plainText.includes('NO CANDIDATO') || plainText.includes('NOT A CANDIDATE')) {
    adherencePrognosis.level = 'not-candidate';
  }

  // Extraer razón
  const reasonMatch = plainText.match(/Raz[oó]n:\s*([^.]+\.)/i) || plainText.match(/Reason:\s*([^.]+\.)/i);
  if (reasonMatch?.[1]) {
    adherencePrognosis.reason = reasonMatch[1].trim();
  }

  // Extraer recomendación
  const recoMatch = plainText.match(/Recomendaci[oó]n:\s*([^.]+\.)/i) || plainText.match(/Recommendation:\s*([^.]+\.)/i);
  if (recoMatch?.[1]) {
    adherencePrognosis.recommendation = recoMatch[1].trim();
  }

  // Extraer barreras identificadas
  const barriersMatch = plainText.match(/Barreras identificadas:\s*([^\n]+)/i) || plainText.match(/Identified barriers:\s*([^\n]+)/i);
  if (barriersMatch?.[1]) {
    const barrierText = barriersMatch[1];
    if (!barrierText.includes('No reportado') && !barrierText.includes('Not reported')) {
      adherencePrognosis.barriers = barrierText.split(/[,;]/).map(b => b.trim()).filter(b => b.length > 2);
    }
  }

  // Extraer red flags detectados
  const redFlagsMatch = plainText.match(/Red Flags[^:]*:\s*([^\n]+)/i);
  if (redFlagsMatch?.[1]) {
    const flagText = redFlagsMatch[1];
    if (!flagText.includes('Ninguno') && !flagText.includes('None')) {
      // Buscar items con ❌ o bullets
      const flagMatches = flagText.matchAll(/(?:❌|•|-)\s*([^❌•\-\n]+)/g);
      for (const match of flagMatches) {
        if (match[1] && match[1].trim().length > 3) {
          adherencePrognosis.redFlags.push(match[1].trim());
        }
      }
    }
  }

  return { alerts, motivation, systems, completeness, duration, chiefComplaint, keyFindings, adherencePrognosis };
};

const extractScore = (html: string, regex: RegExp, fieldName: string): number => {
  const match = html.match(regex);
  if (!match || !match[1]) {
    logger.warn(`Parsing fallido para ${fieldName}`, { pattern: regex.toString().substring(0, 50) });
    return 0;
  }
  return parseInt(match[1]);
};

// Función flexible para extraer scores que maneja múltiples formatos de HTML
// Busca el label y luego el patrón X/10 cercano en texto plano
const extractScoreFlexible = (plainText: string, html: string, labels: string[], fieldName: string): number => {
  // Múltiples patrones para diferentes formatos
  for (const label of labels) {
    // Patrón 1: En texto plano, label seguido de X/10 (con cualquier cosa en medio hasta 50 chars)
    const plainPattern = new RegExp(`${label}[^0-9]{0,50}(\\d+)\\s*\\/\\s*10`, 'i');
    const plainMatch = plainText.match(plainPattern);
    if (plainMatch?.[1]) {
      const score = parseInt(plainMatch[1]);
      if (score >= 0 && score <= 10) return score;
    }

    // Patrón 2: En HTML con tags entre label y score
    const htmlPattern = new RegExp(`${label}[\\s\\S]{0,100}?>(\\d+)\\/10<`, 'i');
    const htmlMatch = html.match(htmlPattern);
    if (htmlMatch?.[1]) {
      const score = parseInt(htmlMatch[1]);
      if (score >= 0 && score <= 10) return score;
    }

    // Patrón 3: Formato directo "Label: X/10" o "Label [X/10]"
    const directPattern = new RegExp(`${label}[:\\s]+\\[?(\\d+)\\/10\\]?`, 'i');
    const directMatch = html.match(directPattern);
    if (directMatch?.[1]) {
      const score = parseInt(directMatch[1]);
      if (score >= 0 && score <= 10) return score;
    }
  }

  logger.warn(`Parsing fallido para ${fieldName}`, { labels: labels.join(', ') });
  return 0;
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
                ? 'bg-white text-teal-700 shadow-md ring-2 ring-teal-200'
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
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border-l-4 border-teal-500">
                <h3 className="text-sm font-semibold text-teal-700 mb-2 uppercase tracking-wide">
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

            {/* Pronóstico de Adherencia - CRÍTICO para filtrar pacientes */}
            {parsed.adherencePrognosis.level !== 'unknown' && (
              <div className={`rounded-xl p-6 border-2 ${
                parsed.adherencePrognosis.level === 'ideal'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400'
                  : parsed.adherencePrognosis.level === 'reservations'
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-400'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                    parsed.adherencePrognosis.level === 'ideal'
                      ? 'bg-green-500'
                      : parsed.adherencePrognosis.level === 'reservations'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}>
                    {parsed.adherencePrognosis.level === 'ideal' ? '🟢' :
                     parsed.adherencePrognosis.level === 'reservations' ? '🟡' : '🔴'}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                      {language === 'es' ? 'Pronóstico de Adherencia' : 'Adherence Prognosis'}
                    </h3>
                    <p className={`text-2xl font-bold ${
                      parsed.adherencePrognosis.level === 'ideal'
                        ? 'text-green-700'
                        : parsed.adherencePrognosis.level === 'reservations'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}>
                      {parsed.adherencePrognosis.level === 'ideal'
                        ? (language === 'es' ? 'CANDIDATO IDEAL' : 'IDEAL CANDIDATE')
                        : parsed.adherencePrognosis.level === 'reservations'
                        ? (language === 'es' ? 'CON RESERVAS' : 'WITH RESERVATIONS')
                        : (language === 'es' ? 'NO CANDIDATO ACTUAL' : 'NOT A CANDIDATE NOW')}
                    </p>
                  </div>
                </div>

                {parsed.adherencePrognosis.reason && (
                  <p className="text-slate-700 mb-3">
                    <strong>{language === 'es' ? 'Razón:' : 'Reason:'}</strong> {parsed.adherencePrognosis.reason}
                  </p>
                )}

                {parsed.adherencePrognosis.recommendation && (
                  <p className="text-slate-600 italic mb-3">
                    <strong>{language === 'es' ? 'Recomendación:' : 'Recommendation:'}</strong> {parsed.adherencePrognosis.recommendation}
                  </p>
                )}

                {/* Barreras y Red Flags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {parsed.adherencePrognosis.barriers.length > 0 && (
                    <div className="bg-white/60 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">
                        🚧 {language === 'es' ? 'Barreras Identificadas' : 'Identified Barriers'}
                      </h4>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {parsed.adherencePrognosis.barriers.map((barrier, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-slate-400">•</span>
                            <span>{barrier}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.adherencePrognosis.redFlags.length > 0 && (
                    <div className="bg-white/60 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-red-700 mb-2">
                        ⚠️ {language === 'es' ? 'Red Flags Detectados' : 'Red Flags Detected'}
                      </h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {parsed.adherencePrognosis.redFlags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span>❌</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700">
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
                    <p className="text-4xl font-bold text-teal-700">{parsed.duration}</p>
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
              <div className="bg-white border-2 border-teal-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  {language === 'es' ? 'Hallazgos Clave' : 'Key Findings'}
                </h3>
                <div className="space-y-3">
                  {parsed.keyFindings.map((finding, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-teal-50 rounded-lg p-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
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
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(
              summaryHTML.match(/🩺\s*(?:Análisis Clínico|Clinical Analysis)[\s\S]*?(?=🎯\s*(?:Análisis|Motivation)|$)/i)?.[0] || ''
            ) || '<p class="text-gray-500">Sección no disponible</p>' }} />
          </div>
        )}

        {activeTab === 'systems' && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(
              summaryHTML.match(/🔬\s*(?:Matriz de Sistemas|Systems Matrix)[\s\S]*?(?=📋\s*(?:Resumen|Executive)|🩺|$)/i)?.[0] || ''
            ) || '<p class="text-gray-500">Sección no disponible</p>' }} />
          </div>
        )}

        {activeTab === 'motivation' && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(
              summaryHTML.match(/🎯\s*(?:Análisis de Motivación|Motivation Analysis)[\s\S]*?(?=✅\s*(?:Checklist|Follow)|$)/i)?.[0] || ''
            ) || '<p class="text-gray-500">Sección no disponible</p>' }} />
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(
              summaryHTML.match(/P\s*-\s*PLAN[\s\S]*?(?=🔬\s*(?:Estudios|Suggested)|📆|$)/i)?.[0] || ''
            ) || '<p class="text-gray-500">Sección no disponible</p>' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicalSummaryView;
