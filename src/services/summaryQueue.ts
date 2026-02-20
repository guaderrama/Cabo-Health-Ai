/**
 * Summary Queue Service
 *
 * Manages the async summary generation queue.
 * Ensures interview transcripts are SAVED FIRST before AI processing,
 * so data is never lost even if summary generation fails.
 */

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { PendingSummary, PendingSummaryStatus, TranscriptMessage, Language } from '../types';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * Saves interview transcript to pending_summaries queue
 * This should be called IMMEDIATELY when user ends session,
 * BEFORE attempting to generate the summary
 */
export async function savePendingSummary(
  userId: string,
  sessionId: string,
  transcript: TranscriptMessage[],
  language: Language,
  patientName?: string,
  sessionDuration?: number
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const pendingSummary: Omit<PendingSummary, 'id' | 'created_at' | 'updated_at' | 'processed_at'> = {
      session_id: sessionId,
      user_id: userId,
      transcript,
      patient_name: patientName,
      language,
      session_duration: sessionDuration,
      status: 'pending',
      attempts: 0,
    };

    // Check if entry already exists (e.g., from a previous failed attempt)
    const { data: existing } = await supabase
      .from('pending_summaries')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    let result;
    if (existing?.id) {
      // Update existing entry
      result = await supabase
        .from('pending_summaries')
        .update({
          transcript,
          patient_name: patientName,
          session_duration: sessionDuration,
          status: 'pending',
          error_message: null,
        })
        .eq('id', existing.id)
        .select('id')
        .single();
    } else {
      // Insert new entry
      result = await supabase
        .from('pending_summaries')
        .insert([pendingSummary])
        .select('id')
        .single();
    }

    if (result.error) throw result.error;

    return { success: true, id: result.data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error saving pending summary';
    logger.error('Error saving pending summary:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates the status of a pending summary
 */
export async function updateSummaryStatus(
  sessionId: string,
  status: PendingSummaryStatus,
  summary?: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Partial<PendingSummary> & { processed_at?: string } = {
      status,
    };

    if (summary) {
      updateData.summary = summary;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (status === 'completed' || status === 'failed') {
      updateData.processed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('pending_summaries')
      .update(updateData)
      .eq('session_id', sessionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating summary status';
    logger.error('Error updating summary status:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Increments the attempt count for a pending summary
 */
export async function incrementAttempts(sessionId: string): Promise<void> {
  try {
    // Get current attempts
    const { data } = await supabase
      .from('pending_summaries')
      .select('attempts')
      .eq('session_id', sessionId)
      .single();

    if (data) {
      await supabase
        .from('pending_summaries')
        .update({ attempts: (data.attempts || 0) + 1 })
        .eq('session_id', sessionId);
    }
  } catch (error) {
    logger.error('Error incrementing attempts:', error);
  }
}

/**
 * Gets a pending summary by session ID
 */
export async function getPendingSummary(
  sessionId: string
): Promise<PendingSummary | null> {
  try {
    const { data, error } = await supabase
      .from('pending_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Error getting pending summary:', error);
    return null;
  }
}

/**
 * Gets all pending summaries for a user (for recovery UI)
 */
export async function getUserPendingSummaries(
  userId: string
): Promise<PendingSummary[]> {
  try {
    const { data, error } = await supabase
      .from('pending_summaries')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing', 'failed'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Error getting user pending summaries:', error);
    return [];
  }
}

/**
 * Marks a summary as completed with the generated summary text
 */
export async function completeSummary(
  sessionId: string,
  summary: string
): Promise<{ success: boolean; error?: string }> {
  return updateSummaryStatus(sessionId, 'completed', summary);
}

/**
 * Marks a summary as failed with error details
 */
export async function failSummary(
  sessionId: string,
  errorMessage: string
): Promise<{ success: boolean; error?: string }> {
  return updateSummaryStatus(sessionId, 'failed', undefined, errorMessage);
}

/**
 * Deletes a pending summary (e.g., after user successfully sends to doctor)
 */
export async function deletePendingSummary(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pending_summaries')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting pending summary';
    logger.error('Error deleting pending summary:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Saves pending summary with retry logic
 */
export async function savePendingSummaryWithRetry(
  userId: string,
  sessionId: string,
  transcript: TranscriptMessage[],
  language: Language,
  patientName?: string,
  sessionDuration?: number,
  attempt: number = 1
): Promise<{ success: boolean; error?: string; id?: string }> {
  const result = await savePendingSummary(
    userId,
    sessionId,
    transcript,
    language,
    patientName,
    sessionDuration
  );

  if (!result.success && attempt < MAX_RETRY_ATTEMPTS) {
    const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    return savePendingSummaryWithRetry(
      userId,
      sessionId,
      transcript,
      language,
      patientName,
      sessionDuration,
      attempt + 1
    );
  }

  return result;
}
