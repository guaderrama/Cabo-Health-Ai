/**
 * Auto-save consultation to the consultations table
 *
 * This ensures patient interviews are ALWAYS visible to doctors,
 * even if the patient doesn't click "Send to Doctor" in the modal.
 * The modal becomes an optional step to add/correct patient details.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { TranscriptMessage, Language } from '../types';

/** Extract motivation/empathy scores from summary HTML */
function extractScores(summary: string) {
  const extractScore = (text: string, patterns: RegExp[]): number | null => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const score = parseFloat(match[1]);
        if (!isNaN(score)) return score;
      }
    }
    return null;
  };

  const readinessPatterns = [
    /Readiness\s*general[:\s]+\[?(\d+(?:\.\d+)?)/i,
    /Readiness[:\s]+\[?(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Motivación\s*general[:\s]+\[?(\d+(?:\.\d+)?)/i
  ];
  const importancePatterns = [
    /Importancia\s*del\s*cambio[:\s]+\[?(\d+(?:\.\d+)?)/i,
    /Importancia[:\s]+\[?(\d+(?:\.\d+)?)\s*\/\s*10/i
  ];
  const confidencePatterns = [
    /Confianza\s*en\s*cambiar[:\s]+\[?(\d+(?:\.\d+)?)/i,
    /Confianza[:\s]+\[?(\d+(?:\.\d+)?)\s*\/\s*10/i
  ];

  const readinessScore = extractScore(summary, readinessPatterns);
  const importanceScore = extractScore(summary, importancePatterns);
  const confidenceScore = extractScore(summary, confidencePatterns);

  const motivationScore = readinessScore !== null
    ? (importanceScore !== null ? (readinessScore + importanceScore) / 2 : readinessScore)
    : 5.0;

  return { motivationScore, empathyScore: confidenceScore };
}

/**
 * Auto-saves the consultation to the consultations table immediately after
 * summary generation. This guarantees the doctor sees it in their dashboard.
 */
export async function autoSaveConsultation(params: {
  userId: string;
  userEmail?: string;
  sessionId: string;
  patientName: string;
  transcript: TranscriptMessage[];
  summary: string;
  language: Language;
  sessionDuration: number;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, userEmail, sessionId, patientName, transcript, summary, language, sessionDuration } = params;

  try {
    // Check if already saved (e.g., patient already clicked "Send to Doctor")
    const { data: existing } = await supabase
      .from('consultations')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      logger.debug('📋 Consultation already saved for session:', sessionId);
      return { success: true };
    }

    const { motivationScore, empathyScore } = extractScores(summary);

    const { error } = await supabase
      .from('consultations')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        patient_name: patientName,
        patient_email: userEmail || null,
        language,
        transcript,
        summary,
        motivation_score: motivationScore,
        empathy_score: empathyScore,
        session_duration: sessionDuration,
        message_count: transcript.length,
        status: 'completed',
      }]);

    if (error) {
      // If unique constraint violation, consultation was saved between our check and insert
      if (error.code === '23505') {
        logger.debug('📋 Consultation already saved (concurrent save):', sessionId);
        return { success: true };
      }
      throw error;
    }

    logger.debug('✅ Consultation auto-saved to consultations table:', sessionId);
    return { success: true };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Auto-save consultation failed:', msg);
    return { success: false, error: msg };
  }
}
