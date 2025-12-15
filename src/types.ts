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
