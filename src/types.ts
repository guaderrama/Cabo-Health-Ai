export type AppState = 'IDLE' | 'COUNTDOWN' | 'CONNECTING' | 'LISTENING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export type Language = 'es' | 'en';

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
  created_at?: string;
  updated_at?: string;
}

export interface RecoverableSession {
  checkpoint: SessionCheckpoint;
  elapsedTime: number;
  formattedTime: string;
  isRecent: boolean; // Menos de 24 horas
}
