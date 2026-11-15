/**
 * Auto-save consultation to the consultations table
 *
 * This ensures patient interviews are ALWAYS visible to doctors,
 * even if the patient doesn't click "Send to Doctor" in the modal.
 * The patient's date of birth is collected on the welcome screen, so no extra step is needed.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { TranscriptMessage, Language } from '../types';
import { extractScoresFromSummary } from '../utils/consultation';

/**
 * Auto-saves the consultation to the consultations table immediately after
 * summary generation. This guarantees the doctor sees it in their dashboard.
 */
export async function autoSaveConsultation(params: {
  userId: string;
  userEmail?: string;
  sessionId: string;
  patientName: string;
  patientDob?: string;
  transcript: TranscriptMessage[];
  summary: string;
  language: Language;
  sessionDuration: number;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, userEmail, sessionId, patientName, patientDob, transcript, summary, language, sessionDuration } = params;

  try {
    const { motivationScore, empathyScore } = extractScoresFromSummary(summary);
    // "failed" is a UI-only flag (message that never reached Nova)
    const cleanTranscript = transcript.map(({ failed: _failed, ...msg }) => msg);

    // The server may have saved it first (generate-summary-openai / finish-summaries). Its summary
    // stays (the page may only have a Gemini fallback); the page adds the final transcript.
    const { data: existing } = await supabase
      .from('consultations')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from('consultations')
        .update({
          transcript: cleanTranscript,
          message_count: transcript.length,
          ...(patientDob ? { patient_dob: patientDob } : {}),
        })
        .eq('id', existing.id);
      if (updateError) throw updateError;
      logger.debug('📋 Consultation already saved, updated with the final transcript:', sessionId);
      return { success: true };
    }

    const { error } = await supabase
      .from('consultations')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        patient_name: patientName,
        patient_dob: patientDob || null,
        patient_email: userEmail || null,
        language,
        transcript: cleanTranscript,
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
