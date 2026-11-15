// Guarda un resumen terminado aunque el paciente ya no tenga la página abierta: lo marca en
// pending_summaries, crea la consulta que ven "Mis entrevistas" y el panel del médico, y borra
// la entrevista guardada a medias para que la app no ofrezca continuarla.
import { dbDelete, dbInsertIgnoringDuplicates, dbUpdate, getUserEmail } from './db.ts';
import { extractScoresFromSummary } from './scores.ts';

export interface PendingRow {
  id: string;
  session_id: string;
  user_id: string;
  patient_name: string | null;
  patient_dob: string | null;
  patient_email: string | null;
  language: string | null;
  transcript: Array<Record<string, unknown>> | null;
  session_duration: number | null;
  status: string;
  openai_response_id: string | null;
  summary_started_at: string | null;
}

export const PENDING_COLUMNS =
  'id,session_id,user_id,patient_name,patient_dob,patient_email,language,transcript,session_duration,status,openai_response_id,summary_started_at';

export async function saveFinishedSummary(row: PendingRow, summary: string): Promise<void> {
  // "failed" solo existe en la pantalla (mensaje que nunca llegó a Nova)
  const transcript = (row.transcript ?? []).map(({ failed: _failed, ...msg }) => msg);
  const { motivationScore, empathyScore } = extractScoresFromSummary(summary);

  await dbInsertIgnoringDuplicates('consultations', 'session_id', {
    user_id: row.user_id,
    session_id: row.session_id,
    patient_name: row.patient_name,
    patient_dob: row.patient_dob,
    patient_email: row.patient_email ?? await getUserEmail(row.user_id),
    language: row.language ?? 'es',
    transcript,
    summary,
    motivation_score: motivationScore,
    empathy_score: empathyScore,
    session_duration: row.session_duration ?? 0,
    message_count: transcript.length,
    status: 'completed',
  });
  await dbUpdate('pending_summaries', `id=eq.${row.id}`, {
    status: 'completed',
    summary,
    error_message: null,
    processed_at: new Date().toISOString(),
  });
  await dbDelete('session_checkpoints', `session_id=eq.${encodeURIComponent(row.session_id)}`);
}

/** Solo si no tiene resumen: si el navegador ya lo terminó, no se toca. Quita el enlace a OpenAI. */
export async function markSummaryFailed(row: PendingRow, message: string): Promise<void> {
  await dbUpdate('pending_summaries', `id=eq.${row.id}&status=in.(processing,failed)`, {
    status: 'failed',
    error_message: message.slice(0, 500),
    openai_response_id: null,
  });
}
