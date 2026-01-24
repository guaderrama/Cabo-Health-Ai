export type AppState = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export type Language = 'es' | 'en';

// Interview mode types - Voice or Text with dictation
export type InterviewMode = 'VOICE' | 'TEXT';

// Module system types for interview segmentation
export type InterviewModule = 'MODULE_1' | 'MODULE_2' | 'MODULE_3';

export interface ModuleConfig {
  id: InterviewModule;
  name: string;
  nameEs: string;
  areas: number[];        // Which of the 20 areas are covered
  estimatedMinutes: { min: number; max: number };
  hasGreeting: boolean;   // Only MODULE_1 has greeting
  hasClosing: boolean;    // Only MODULE_3 has closing
}

export interface ModuleProgress {
  currentModule: InterviewModule;
  completedModules: InterviewModule[];
  moduleTranscripts: Record<InterviewModule, TranscriptMessage[]>;
  moduleStartTimes: Record<InterviewModule, number | null>;
  moduleEndTimes: Record<InterviewModule, number | null>;
}

export interface TranscriptMessage {
  id: string;
  sender: 'You' | 'Nova';
  text: string;
  lang: Language;
  audioUrl?: string; // URL del audio almacenado en Supabase Storage
  timestamp?: string; // Timestamp del mensaje
}

export interface SessionCheckpoint {
  id?: string;
  user_id: string;
  session_id: string;
  patient_name: string;
  language: Language;
  app_state: AppState;
  transcript: TranscriptMessage[];
  current_input_transcription?: string;
  current_output_transcription?: string;
  session_start_time: number;
  last_checkpoint_time: number;
  message_count: number;
  // Module system fields
  current_module?: InterviewModule;
  completed_modules?: InterviewModule[];
  module_transcripts?: Record<InterviewModule, TranscriptMessage[]>;
  created_at?: string;
  updated_at?: string;
}

export interface RecoverableSession {
  checkpoint: SessionCheckpoint;
  elapsedTime: number;
  formattedTime: string;
  isRecent: boolean; // Menos de 24 horas
}

// Pending Summary types for async summary generation queue
export type PendingSummaryStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PendingSummary {
  id?: string;
  session_id: string;
  user_id: string;
  transcript: TranscriptMessage[];
  patient_name?: string;
  language: Language;
  session_duration?: number;
  status: PendingSummaryStatus;
  summary?: string;
  error_message?: string;
  attempts: number;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}

// Topic tracking types for TEXT mode
export type TopicNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export interface TopicMarker {
  c: number[];      // Temas cubiertos (covered)
  p: number | null; // Tema que se va a preguntar (pending)
}

export interface TopicTracking {
  coveredTopics: Set<number>;
  currentTopic: number | null;
  lastUpdated: string;
}

// Topic names for display
export const TOPIC_NAMES: Record<Language, Record<number, string>> = {
  es: {
    1: 'Motivo de consulta',
    2: 'Línea de tiempo',
    3: 'Síntomas digestivos',
    4: 'Sueño',
    5: 'Energía',
    6: 'Estrés',
    7: 'Medicamentos',
    8: 'Antecedentes',
    9: 'Hábitos intestinales',
    10: 'Sensibilidades',
    11: 'Alimentación',
    12: 'Actividad física',
    13: 'Exposición ambiental',
    14: 'Consumo',
    15: 'Señales hormonales',
    16: 'Inmunidad',
    17: 'Ultraprocesados',
    18: 'Fibra/fermentados',
    19: 'Bienestar emocional',
    20: 'Info adicional',
  },
  en: {
    1: 'Main concern',
    2: 'Timeline',
    3: 'Digestive symptoms',
    4: 'Sleep',
    5: 'Energy',
    6: 'Stress',
    7: 'Medications',
    8: 'Medical history',
    9: 'Bowel habits',
    10: 'Sensitivities',
    11: 'Diet',
    12: 'Physical activity',
    13: 'Environmental',
    14: 'Consumption',
    15: 'Hormonal signs',
    16: 'Immunity',
    17: 'Ultra-processed',
    18: 'Fiber/fermented',
    19: 'Emotional wellbeing',
    20: 'Additional info',
  },
};
