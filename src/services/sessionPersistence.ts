import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { SessionCheckpoint, RecoverableSession, TranscriptMessage, AppState, Language, InterviewModule } from '../types';

const CHECKPOINT_INTERVAL = 2; // Guardar cada 2 mensajes
const LOCAL_STORAGE_KEY = 'cabo_health_session_checkpoint';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 segundo

/**
 * Guarda un checkpoint de la sesión actual
 * Utiliza localStorage para respaldo inmediato y Supabase para persistencia
 */
export async function saveSessionCheckpoint(
  userId: string,
  sessionId: string,
  patientName: string,
  language: Language,
  appState: AppState,
  transcript: TranscriptMessage[],
  currentInputTranscription: string,
  currentOutputTranscription: string,
  sessionStartTime: number,
  // Module system parameters (optional for backwards compatibility)
  currentModule?: InterviewModule,
  completedModules?: InterviewModule[],
  moduleTranscripts?: Record<InterviewModule, TranscriptMessage[]>
): Promise<{ success: boolean; error?: string }> {
  const checkpoint: SessionCheckpoint = {
    user_id: userId,
    session_id: sessionId,
    patient_name: patientName,
    language,
    app_state: appState,
    transcript,
    current_input_transcription: currentInputTranscription,
    current_output_transcription: currentOutputTranscription,
    session_start_time: sessionStartTime,
    last_checkpoint_time: Date.now(),
    message_count: transcript.length,
    // Module system fields
    current_module: currentModule,
    completed_modules: completedModules,
    module_transcripts: moduleTranscripts,
  };

  // Guardar en localStorage inmediatamente
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(checkpoint));
  } catch (e) {
    logger.error('Error guardando en localStorage:', e);
  }

  // Guardar en Supabase con reintentos
  return await saveToSupabaseWithRetry(checkpoint);
}

/**
 * Guarda en Supabase con lógica de reintento exponencial
 */
async function saveToSupabaseWithRetry(
  checkpoint: SessionCheckpoint,
  attempt: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    // Intentar actualizar primero - usar maybeSingle() para evitar 406 cuando no hay filas
    const { data: existing, error: selectError } = await supabase
      .from('session_checkpoints')
      .select('id')
      .eq('session_id', checkpoint.session_id)
      .eq('user_id', checkpoint.user_id)
      .maybeSingle();

    if (selectError) {
      // Solo lanzar error si es diferente a "no encontrado"
      if (selectError.code !== 'PGRST116') {
        throw selectError;
      }
    }

    let result;
    if (existing?.id) {
      // Actualizar checkpoint existente
      result = await supabase
        .from('session_checkpoints')
        .update({
          ...checkpoint,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Insertar nuevo checkpoint
      result = await supabase
        .from('session_checkpoints')
        .insert([checkpoint]);
    }

    if (result.error) throw result.error;

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    logger.error(`Error guardando checkpoint (intento ${attempt}):`, errorMessage);

    if (attempt < MAX_RETRY_ATTEMPTS) {
      // Reintento con delay exponencial
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return saveToSupabaseWithRetry(checkpoint, attempt + 1);
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Verifica si debe guardarse un checkpoint basado en el número de mensajes
 */
export function shouldSaveCheckpoint(messageCount: number, lastSavedCount: number): boolean {
  return messageCount > 0 && (messageCount - lastSavedCount) >= CHECKPOINT_INTERVAL;
}

/**
 * Busca sesiones recuperables para el usuario actual
 * Primero intenta localStorage, luego Supabase
 */
export async function findRecoverableSessions(
  userId: string
): Promise<RecoverableSession[]> {
  const recoverableSessions: RecoverableSession[] = [];
  const now = Date.now();

  // Buscar en localStorage
  try {
    const localCheckpointStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localCheckpointStr) {
      const localCheckpoint: SessionCheckpoint = JSON.parse(localCheckpointStr);
      
      // Validar que sea del usuario actual y que esté en estado LISTENING
      if (
        localCheckpoint.user_id === userId &&
        localCheckpoint.app_state === 'LISTENING' &&
        localCheckpoint.message_count > 0
      ) {
        const elapsedTime = now - localCheckpoint.session_start_time;
        const isRecent = (now - localCheckpoint.last_checkpoint_time) < 24 * 60 * 60 * 1000; // 24 horas

        if (isRecent) {
          recoverableSessions.push({
            checkpoint: localCheckpoint,
            elapsedTime,
            formattedTime: formatElapsedTime(elapsedTime),
            isRecent: true,
          });
        }
      }
    }
  } catch (e) {
    logger.error('Error leyendo localStorage:', e);
  }

  // Buscar en Supabase
  try {
    const { data: checkpoints, error } = await supabase
      .from('session_checkpoints')
      .select('*')
      .eq('user_id', userId)
      .eq('app_state', 'LISTENING')
      .gt('message_count', 0)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (!error && checkpoints) {
      for (const checkpoint of checkpoints) {
        // Evitar duplicados con localStorage
        const isDuplicate = recoverableSessions.some(
          rs => rs.checkpoint.session_id === checkpoint.session_id
        );

        if (!isDuplicate) {
          const elapsedTime = now - checkpoint.session_start_time;
          const isRecent = (now - checkpoint.last_checkpoint_time) < 24 * 60 * 60 * 1000;

          if (isRecent) {
            recoverableSessions.push({
              checkpoint,
              elapsedTime,
              formattedTime: formatElapsedTime(elapsedTime),
              isRecent: true,
            });
          }
        }
      }
    }
  } catch (e) {
    logger.error('Error buscando checkpoints en Supabase:', e);
  }

  return recoverableSessions;
}

/**
 * Carga un checkpoint específico para recuperar la sesión
 */
export function loadCheckpoint(checkpoint: SessionCheckpoint): SessionCheckpoint {
  return checkpoint;
}

/**
 * Limpia el checkpoint de localStorage y opcionalmente de Supabase
 */
export async function clearCheckpoint(sessionId: string, userId: string): Promise<void> {
  // Limpiar localStorage
  try {
    const localCheckpointStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localCheckpointStr) {
      const localCheckpoint: SessionCheckpoint = JSON.parse(localCheckpointStr);
      if (localCheckpoint.session_id === sessionId) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  } catch (e) {
    logger.error('Error limpiando localStorage:', e);
  }

  // Limpiar Supabase
  try {
    await supabase
      .from('session_checkpoints')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  } catch (e) {
    logger.error('Error limpiando checkpoint de Supabase:', e);
  }
}

/**
 * Formatea el tiempo transcurrido en un string legible
 */
function formatElapsedTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  } else if (minutes > 0) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Valida la integridad de un checkpoint
 */
export function validateCheckpoint(checkpoint: SessionCheckpoint): boolean {
  return !!(
    checkpoint.session_id &&
    checkpoint.user_id &&
    checkpoint.language &&
    checkpoint.app_state &&
    Array.isArray(checkpoint.transcript) &&
    typeof checkpoint.session_start_time === 'number' &&
    typeof checkpoint.message_count === 'number'
  );
}

// ==========================================
// MODULE SYSTEM HELPERS
// ==========================================

/**
 * Saves a completed module's transcript
 * Called when transitioning between modules
 */
export async function saveModuleTranscript(
  userId: string,
  sessionId: string,
  module: InterviewModule,
  transcript: TranscriptMessage[],
  existingModuleTranscripts: Record<InterviewModule, TranscriptMessage[]>
): Promise<Record<InterviewModule, TranscriptMessage[]>> {
  const updatedTranscripts = {
    ...existingModuleTranscripts,
    [module]: transcript,
  };

  // Save to localStorage for quick access
  try {
    const moduleKey = `cabo_health_module_${sessionId}`;
    localStorage.setItem(moduleKey, JSON.stringify(updatedTranscripts));
  } catch (e) {
    logger.error('Error saving module transcript to localStorage:', e);
  }

  return updatedTranscripts;
}

/**
 * Merges all module transcripts into a single transcript for summary generation
 */
export function mergeModuleTranscripts(
  moduleTranscripts: Record<InterviewModule, TranscriptMessage[]>
): TranscriptMessage[] {
  const modules: InterviewModule[] = ['MODULE_1', 'MODULE_2', 'MODULE_3'];
  const merged: TranscriptMessage[] = [];

  for (const module of modules) {
    const transcript = moduleTranscripts[module];
    if (transcript && transcript.length > 0) {
      merged.push(...transcript);
    }
  }

  return merged;
}

/**
 * Gets the total message count across all modules
 */
export function getTotalModuleMessageCount(
  moduleTranscripts: Record<InterviewModule, TranscriptMessage[]>
): number {
  let total = 0;
  for (const module of Object.keys(moduleTranscripts) as InterviewModule[]) {
    total += moduleTranscripts[module]?.length || 0;
  }
  return total;
}

/**
 * Clears module-specific data from localStorage
 */
export function clearModuleData(sessionId: string): void {
  try {
    const moduleKey = `cabo_health_module_${sessionId}`;
    localStorage.removeItem(moduleKey);
  } catch (e) {
    logger.error('Error clearing module data from localStorage:', e);
  }
}

/**
 * Loads module transcripts from localStorage
 */
export function loadModuleTranscripts(
  sessionId: string
): Record<InterviewModule, TranscriptMessage[]> | null {
  try {
    const moduleKey = `cabo_health_module_${sessionId}`;
    const data = localStorage.getItem(moduleKey);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    logger.error('Error loading module transcripts from localStorage:', e);
  }
  return null;
}

/**
 * Creates an empty module transcripts record
 */
export function createEmptyModuleTranscripts(): Record<InterviewModule, TranscriptMessage[]> {
  return {
    MODULE_1: [],
    MODULE_2: [],
    MODULE_3: [],
  };
}
