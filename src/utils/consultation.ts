import { Language } from '../types';

export interface MotivationLevel {
  level: 'high' | 'medium' | 'low' | 'unknown';
  color: string;
  textColor: string;
}

export interface ExtractedScores {
  motivationScore: number;
  empathyScore: number | null;
  readiness: number | null;
  importance: number | null;
  confidence: number | null;
}

/**
 * Centralized score extraction from summary HTML.
 * Scopes searches to the correct section to avoid false matches.
 */
export function extractScoresFromSummary(summary: string): ExtractedScores {
  // Strip HTML to get plain text
  const plainText = summary.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  // Scope: extract only the Motivation Analysis section for readiness/importance/confidence
  const motivationSection = plainText.match(
    /(?:Análisis de Motivación|Motivation Analysis)[\s\S]*?(?:Checklist|Notas Clínicas|Clinical Notes|Additional|$)/i
  )?.[0] || '';

  // Also check the "Readiness to Change" dashboard widget
  const readinessWidget = plainText.match(
    /(?:Readiness to Change|Disposición al Cambio)[\s\S]*?(?:Systems Matrix|Matriz de Sistemas|Executive|Resumen Ejecutivo|🔬|$)/i
  )?.[0] || '';

  // Combined scoped text for motivation scores (section + widget, NOT full text)
  const scopedText = motivationSection + ' ' + readinessWidget;

  const extractFirst = (text: string, patterns: RegExp[]): number | null => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 0 && val <= 10) return val;
      }
    }
    return null;
  };

  // Readiness patterns (ES + EN) - search ONLY in scoped motivation section
  const readiness = extractFirst(scopedText, [
    /Readiness\s*(?:general)?[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /General\s*readiness[:\s]*(\d+(?:\.\d+)?)/i,
    /Motivación\s*(?:general)?[:\s]*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Overall\s*readiness[:\s]*(\d+(?:\.\d+)?)/i,
    // Fallback: "Readiness" label followed by score in dashboard widget
    /Readiness\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
  ]);

  // Importance patterns (ES + EN)
  const importance = extractFirst(scopedText, [
    /Importancia\s*(?:del\s*cambio)?[:\s]*(\d+(?:\.\d+)?)\s*\/?\s*10/i,
    /Importance\s*(?:of\s*change)?[:\s]*(\d+(?:\.\d+)?)\s*\/?\s*10/i,
    /Importance\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Importancia\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
  ]);

  // Confidence patterns (ES + EN)
  const confidence = extractFirst(scopedText, [
    /Confianza\s*(?:en\s*cambiar)?[:\s]*(\d+(?:\.\d+)?)\s*\/?\s*10/i,
    /Confidence\s*(?:in\s*changing)?[:\s]*(\d+(?:\.\d+)?)\s*\/?\s*10/i,
    /Confidence\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Confianza\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
  ]);

  // Motivation score: average of readiness and importance, or just readiness
  const motivationScore = readiness !== null
    ? (importance !== null ? (readiness + importance) / 2 : readiness)
    : 5.0; // default only if nothing found

  return {
    motivationScore,
    empathyScore: confidence,
    readiness,
    importance,
    confidence,
  };
}

/**
 * Formats a date string for display
 */
export const formatDate = (dateString: string, language: Language): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats duration in seconds to "X min Y seg" format
 */
export const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} seg`;
};

/**
 * Returns motivation level styling based on score
 */
export const getMotivationLevel = (score?: number): MotivationLevel => {
  if (!score) return { level: 'unknown', color: 'bg-gray-200', textColor: 'text-gray-600' };
  if (score >= 7) return { level: 'high', color: 'bg-green-500', textColor: 'text-green-700' };
  if (score >= 4) return { level: 'medium', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
  return { level: 'low', color: 'bg-red-500', textColor: 'text-red-700' };
};
