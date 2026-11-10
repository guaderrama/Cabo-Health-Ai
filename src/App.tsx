
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel } from '@google/genai';
import { type AppState, type Language, type TranscriptMessage, type RecoverableSession, type InterviewModule, type InterviewMode } from './types';
import { SUMMARY_PROMPT, getModuleInstructions, getNextModule, MODULE_CONFIGS } from './constants';
import { encode, decode, decodeAudioData, concatenateUint8Arrays } from './utils/audioUtils';
import { sanitizeHtml } from './utils/sanitizeHtml';
import { isGeminiBillingError, getGeminiBillingMessage, isOpenAIBillingError, getOpenAIBillingMessage } from './utils/billingErrors';
import { generateSummaryWithTerra } from './services/terraSummary';
import { TerraChatSession } from './services/terraChat';
import { uploadAudioFragmentWav } from './utils/audioStorage';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import WelcomeScreen from './components/WelcomeScreen';
import TextChatPanel from './components/TextChatPanel';
import TranscriptionPanel from './components/TranscriptionPanel';
import FinishScreen from './components/FinishScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';
import { getInitialLanguage, saveLanguage } from './utils/languagePreference';
import { loadPatientProfile, savePatientProfile } from './utils/patientProfile';
import { playWelcomeSound } from './services/audioService';
import { logger } from './lib/logger';
import { useTopicTracking } from './hooks/useTopicTracking';
import { resetMetrics, logNovaResponse, logTimeout, logError, logReconnect } from './lib/sessionTelemetry';

// Lazy loading de componentes no críticos para mejorar performance inicial
const SessionRecoveryModal = lazy(() => import('./components/SessionRecoveryModal'));
const MicrophoneDiagnostic = lazy(() => import('./components/MicrophoneDiagnostic'));
const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
import {
  saveSessionCheckpoint,
  findRecoverableSessions,
  shouldSaveCheckpoint,
  clearCheckpoint,
  validateCheckpoint,
  saveModuleTranscript,
  mergeModuleTranscripts,
  createEmptyModuleTranscripts,
  clearModuleData,
} from './services/sessionPersistence';
import {
  savePendingSummaryWithRetry,
  updateSummaryStatus,
  completeSummary,
  failSummary,
  incrementAttempts,
} from './services/summaryQueue';
import { autoSaveConsultation } from './services/autoSaveConsultation';

// FIX: A local 'LiveSession' type is defined here based on its usage to resolve the import error.
type LiveSession = {
  sendRealtimeInput(input: { media: { data: string; mimeType: string } }): void;
  sendClientContent(params: {
    turns?: Array<{ role: string; parts: Array<{ text: string }> }> | string;
    turnComplete?: boolean
  }): void;
  close(): void;
};

const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// Constante de timeout para respuesta de Nova (fuera del componente para evitar re-renders)
const NOVA_RESPONSE_TIMEOUT = 10000; // 10 segundos

// Límite de chunks de audio para prevenir memory leak en sesiones largas
const MAX_AUDIO_CHUNKS = 500; // ~500 chunks = ~32KB, suficiente para el turn actual

// Helper para agregar timeout a promesas (evita UI congelada si WebSocket cuelga)
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
};

// Intervalo de actualización de frecuencia (throttle para reducir re-renders)
const FREQUENCY_UPDATE_INTERVAL = 100; // 100ms = 10 updates/segundo en lugar de 60

// Mensaje con el que arranca el chat de TEXTO (también se usa para rehacer el historial al recuperar)
const getTextActivationMessage = (lang: Language) => lang === 'es'
  ? '[Sesión de TEXTO iniciada - Por favor saluda al paciente y comienza la entrevista completa]'
  : '[TEXT session started - Please greet the patient and begin the complete interview]';

// Temas cubiertos en modo TEXTO, para que una entrevista recuperada no empiece en 0
const topicsStorageKey = (sessionId: string) => `cabo_health_topics_${sessionId}`;

/** Contexto para que Nova (voz) retome una conversación interrumpida sin volver a saludar. */
const buildVoiceResumeMessage = (transcript: TranscriptMessage[], lang: Language): string => {
  const lines = transcript
    .slice(-16)
    .map(m => `${m.sender === 'Nova' ? 'Nova' : (lang === 'es' ? 'Paciente' : 'Patient')}: ${m.text.slice(0, 400)}`)
    .join('\n');
  return lang === 'es'
    ? `[La conversación se interrumpió y el paciente regresó. Esto es lo último que platicaron:\n${lines}\nContinúa la entrevista desde ahí: NO saludes de nuevo ni repitas preguntas ya respondidas. Retoma con la siguiente pregunta pendiente.]`
    : `[The conversation was interrupted and the patient is back. This is the last part of what you discussed:\n${lines}\nContinue the interview from there: do NOT greet again or repeat questions already answered. Resume with the next pending question.]`;
};

const App: React.FC = () => {
  const { user, userRole, loading } = useAuth();
  const [language] = useState<Language>(getInitialLanguage);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Detectar cambios en el estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Si está cargando, mostrar pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{language === 'es' ? 'Cargando…' : 'Loading…'}</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar formulario de login
  if (!user) {
    return <AuthForm />;
  }

  // Usuario autenticado - mostrar interfaz según rol
  if (userRole === 'doctor') {
    // Dashboard para médicos con Header
    return (
      <>
        <Header language={language} isOnline={isOnline} userRole="doctor" />
        <ErrorBoundary>
          <DoctorDashboard language={language} />
        </ErrorBoundary>
      </>
    );
  }

  // Interfaz para pacientes (default)
  return <MainApp />;
};

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  // Nombre y fecha de nacimiento se piden una vez y se recuerdan en la cuenta
  const [patientName, setPatientName] = useState(() => loadPatientProfile(user).fullName);
  const [patientDob, setPatientDob] = useState(() => loadPatientProfile(user).dateOfBirth);
  const [interviewMode, setInterviewMode] = useState<InterviewMode | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [avgFrequency, setAvgFrequency] = useState(0);
  const [summaryGenerationFailed, setSummaryGenerationFailed] = useState(false); // Para mostrar botón "Intentar de nuevo"
  // La entrevista terminó (se muestra la pantalla final) y si fue demasiado corta para enviarse
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [endedTooShort, setEndedTooShort] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Estados para persistencia de sesión
  const [recoverableSessions, setRecoverableSessions] = useState<RecoverableSession[]>([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [isSavingCheckpoint, setIsSavingCheckpoint] = useState(false);
  const [lastCheckpointTime, setLastCheckpointTime] = useState<number | null>(null);
  const [lastSavedMessageCount, setLastSavedMessageCount] = useState(0);

  // Estados para diagnóstico de micrófono
  const [showMicrophoneDiagnostic, setShowMicrophoneDiagnostic] = useState(false);

  // Estados para sistema de módulos
  const [currentModule, setCurrentModule] = useState<InterviewModule>('MODULE_1');
  const [completedModules, setCompletedModules] = useState<InterviewModule[]>([]);
  const [moduleTranscripts, setModuleTranscripts] = useState<Record<InterviewModule, TranscriptMessage[]>>(createEmptyModuleTranscripts());
  const [isTransitioningModule, setIsTransitioningModule] = useState(false);
  const pendingModuleStartRef = useRef<InterviewModule | null>(null); // Para auto-iniciar después de transición

  // Estado para transición automática por voz
  const [novaAskedTransition, setNovaAskedTransition] = useState(false);
  const novaAskedTransitionRef = useRef(false); // Ref para evitar stale closures en callbacks

  // Estados para detector de silencio
  const [silenceWarningShown, setSilenceWarningShown] = useState(false);

  // Estados para session resumption (reconexión automática)
  const [sessionResumptionHandle, setSessionResumptionHandle] = useState<string | null>(null);
  const sessionResumptionHandleRef = useRef<string | null>(null); // Ref para evitar stale closures
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const isReconnectingRef = useRef(false); // Prevenir race condition en reconexiones múltiples
  const bufferCleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null); // Limpieza periódica de buffers
  const chatSessionRef = useRef<TerraChatSession | null>(null); // Chat de modo TEXT con GPT-6.1 Terra (Edge Function chat-openai)

  // Hook para tracking de temas en modo TEXT
  const {
    tracking: topicTracking,
    processNovaMessage: processTopicMarker,
    resetTracking: resetTopicTracking,
    loadTracking: loadTopicTracking,
    isComplete: topicsComplete,
  } = useTopicTracking();

  // Estado para detección de conexión
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionLostDuringSession, setConnectionLostDuringSession] = useState(false);

  // Estados para detección de silencio de Nova (cuando Nova no responde)
  const [waitingForNova, setWaitingForNova] = useState(false);
  const userSpokeAtRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null); // Para grace period inicial

  // Estado para sonido de bienvenida (cargar de localStorage con fallback seguro)
  const [welcomeSoundEnabled, setWelcomeSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('welcomeSoundEnabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      // Fallback si localStorage no está disponible (modo incógnito, etc.)
      return true;
    }
  });

  // Guardar preferencia de sonido en localStorage cuando cambia
  useEffect(() => {
    try {
      localStorage.setItem('welcomeSoundEnabled', JSON.stringify(welcomeSoundEnabled));
    } catch {
      // Silently fail if localStorage is not available
    }
  }, [welcomeSoundEnabled]);

  // Recordar el idioma elegido (y marcarlo en <html lang>)
  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  // Si la cuenta trae nombre/fecha guardados y aún no se escribió nada, usarlos
  useEffect(() => {
    const profile = loadPatientProfile(user);
    setPatientName(prev => prev || profile.fullName);
    setPatientDob(prev => prev || profile.dateOfBirth);
  }, [user]);

  // Sin llave de Gemini solo se desactiva la voz; escribir sigue funcionando (va por Edge Function)
  const voiceAvailable = !!import.meta.env.VITE_GEMINI_API_KEY?.trim();

  // ============================================================
  // AUTO-GUARDADO: Guardar transcript periódicamente en pending_summaries
  // Cada 60 segundos o cada 5 mensajes nuevos, salvar silenciosamente
  // ============================================================
  const lastAutoSaveCountRef = useRef(0);
  useEffect(() => {
    if (appState !== 'LISTENING' || !user?.id || !sessionId) return;

    const AUTO_SAVE_INTERVAL = 60000; // 60 segundos

    const autoSaveInterval = setInterval(async () => {
      const currentCount = transcript.length;
      // Solo guardar si hay al menos 2 mensajes y han cambiado desde el último auto-save
      if (currentCount >= 2 && currentCount !== lastAutoSaveCountRef.current) {
        try {
          await savePendingSummaryWithRetry(
            user.id,
            sessionId,
            transcript,
            language,
            patientName,
            sessionStartTimeRef.current
              ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
              : 0
          );
          lastAutoSaveCountRef.current = currentCount;
          logger.debug(`💾 Auto-save: ${currentCount} mensajes guardados en pending_summaries`);
        } catch (e) {
          logger.warn('⚠️ Auto-save falló silenciosamente:', e);
        }
      }
    }, AUTO_SAVE_INTERVAL);

    // También guardar cuando hay 5+ mensajes nuevos desde el último save
    const messageThreshold = 5;
    if (
      transcript.length >= 2 &&
      transcript.length - lastAutoSaveCountRef.current >= messageThreshold &&
      user?.id
    ) {
      savePendingSummaryWithRetry(
        user.id,
        sessionId,
        transcript,
        language,
        patientName,
        sessionStartTimeRef.current
          ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
          : 0
      ).then(() => {
        lastAutoSaveCountRef.current = transcript.length;
        logger.debug(`💾 Auto-save por umbral: ${transcript.length} mensajes guardados`);
      }).catch((e) => {
        logger.warn('⚠️ Auto-save por umbral falló:', e);
      });
    }

    return () => clearInterval(autoSaveInterval);
  }, [appState, transcript.length, user?.id, sessionId, language, patientName]);

  const handleToggleWelcomeSound = () => {
    setWelcomeSoundEnabled((prev: boolean) => !prev);
  };

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  const currentInputAudio = useRef<Uint8Array[]>([]);
  const currentOutputAudio = useRef<Uint8Array[]>([]);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextAudioStartTime = useRef(0);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioTrackEndedHandlerRef = useRef<{ track: MediaStreamTrack; handler: () => void } | null>(null);

  const appStateRef = useRef(appState);
  const interviewModeRef = useRef(interviewMode);
  const endSessionLockRef = useRef(false); // Lock para prevenir race condition en handleEndSession

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Refs para los callbacks de Live API: se crean al conectar y si leyeran el state
  // verían el transcript/sessionId de ese momento (vacío / sesión anterior)
  const transcriptRef = useRef(transcript);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Sincronizar ref de interviewMode para evitar stale closures en callbacks
  useEffect(() => {
    interviewModeRef.current = interviewMode;
  }, [interviewMode]);

  // Sincronizar ref de sessionResumptionHandle para evitar stale closures en callbacks de WebSocket
  useEffect(() => {
    sessionResumptionHandleRef.current = sessionResumptionHandle;
  }, [sessionResumptionHandle]);

  // Sincronizar ref de novaAskedTransition para evitar stale closures en callbacks de WebSocket
  useEffect(() => {
    novaAskedTransitionRef.current = novaAskedTransition;
  }, [novaAskedTransition]);

  // Estado para auto-iniciar sesión después de transición de módulo
  // NOTA: Debe ser estado (no ref) para disparar el useEffect de auto-start
  const [shouldAutoStart, setShouldAutoStart] = useState(false);

  // Detectar cuando debemos auto-iniciar después de transición de módulo
  useEffect(() => {
    if (!isTransitioningModule && pendingModuleStartRef.current && appState === 'IDLE') {
      const moduleToStart = pendingModuleStartRef.current;
      pendingModuleStartRef.current = null; // Limpiar ref antes de iniciar

      logger.debug('🚀 Módulo listo después de transición:', moduleToStart);

      // Verificar que el módulo actual coincide con el pendiente
      if (currentModule === moduleToStart) {
        logger.debug('✅ Marcando para auto-iniciar módulo', moduleToStart);
        setShouldAutoStart(true); // Usar setState para disparar el useEffect de auto-start
      }
    }
  }, [isTransitioningModule, appState, currentModule]);

  // Buscar sesiones recuperables al montar el componente
  useEffect(() => {
    const checkForRecoverableSessions = async () => {
      if (user?.id) {
        const sessions = await findRecoverableSessions(user.id);
        if (sessions.length > 0) {
          setRecoverableSessions(sessions);
          setShowRecoveryModal(true);
        }
      }
    };

    checkForRecoverableSessions();
  }, [user?.id]);

  // Guardar checkpoint automáticamente cuando cambia el transcript
  useEffect(() => {
    const saveCheckpoint = async () => {
      if (
        (appState === 'LISTENING' || appState === 'ERROR') &&
        !interviewEnded &&
        user?.id &&
        sessionId &&
        shouldSaveCheckpoint(transcript.length, lastSavedMessageCount)
      ) {
        setIsSavingCheckpoint(true);

        const result = await saveSessionCheckpoint(
          user.id,
          sessionId,
          patientName,
          language,
          'LISTENING', // Siempre guardar como LISTENING para permitir recuperación
          transcript,
          currentInputTranscription.current,
          currentOutputTranscription.current,
          sessionStartTime,
          // Partes de la entrevista por voz, para poder retomarla en la parte correcta
          currentModule,
          completedModules,
          moduleTranscripts
        );

        setIsSavingCheckpoint(false);

        if (result.success) {
          setLastCheckpointTime(Date.now());
          setLastSavedMessageCount(transcript.length);
        } else {
          logger.error('Error guardando checkpoint:', result.error);
        }
      }
    };

    saveCheckpoint();
  }, [transcript.length, appState, interviewEnded, user?.id, sessionId, patientName, language, sessionStartTime, lastSavedMessageCount, currentModule, completedModules, moduleTranscripts]);

  // Modo TEXTO: guardar los temas cubiertos para que una entrevista recuperada conserve su progreso
  useEffect(() => {
    if (interviewMode !== 'TEXT' || !sessionId || topicTracking.coveredTopics.size === 0) return;
    try {
      localStorage.setItem(topicsStorageKey(sessionId), JSON.stringify([...topicTracking.coveredTopics]));
    } catch {
      // no crítico
    }
  }, [interviewMode, sessionId, topicTracking]);

  // Detector de silencio prolongado - SOLO para modo VOZ, no TEXTO
  useEffect(() => {
    // No ejecutar en modo TEXTO - el micrófono no se usa
    if (interviewMode === 'TEXT') {
      return;
    }

    if (appState !== 'LISTENING') {
      setSilenceWarningShown(false);
      return;
    }

    const SILENCE_THRESHOLD = 5; // Frecuencia menor a 5
    const SILENCE_DURATION = 90000; // 90 segundos de silencio (aumentado de 60)
    const ACTIVITY_CHECK_DURATION = 120000; // 2 minutos para verificar actividad

    let silenceStartTime: number | null = null;
    const interval = setInterval(() => {
      // Verificar si hay actividad reciente en la conversación
      const hasRecentActivity = transcript.length > 0 && transcript.some(msg => {
        const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
        return Date.now() - msgTime < ACTIVITY_CHECK_DURATION;
      });

      // Solo mostrar advertencia si NO hay actividad reciente
      if (avgFrequency < SILENCE_THRESHOLD && !hasRecentActivity) {
        if (!silenceStartTime) {
          silenceStartTime = Date.now();
        } else if (Date.now() - silenceStartTime > SILENCE_DURATION && !silenceWarningShown) {
          const warningMsg = language === 'es'
            ? 'No escuchamos tu voz desde hace un rato. ¿Está funcionando tu micrófono?'
            : "We haven't heard your voice for a while. Is your microphone working?";

          setError(warningMsg);
          setSilenceWarningShown(true);
        }
      } else {
        silenceStartTime = null;
        if (silenceWarningShown) {
          setError(null);
          setSilenceWarningShown(false);
        }
      }
    }, 5000); // Verificar cada 5 segundos

    return () => clearInterval(interval);
  }, [appState, avgFrequency, language, silenceWarningShown, transcript, interviewMode]);

  // Detector de silencio de NOVA (cuando Nova no responde después de que el usuario habla)
  useEffect(() => {
    if (!waitingForNova || appState !== 'LISTENING') return;

    // Grace period: No mostrar timeout en los primeros 15 segundos de sesión
    // Nova puede tardar más en el saludo inicial por el procesamiento del contexto
    const GRACE_PERIOD = 15000;
    const sessionAge = sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0;
    const isInGracePeriod = sessionAge < GRACE_PERIOD;

    if (isInGracePeriod) {
      logger.debug('🕐 En grace period inicial, timeout desactivado');
      return;
    }

    // Advertencia a los 10 segundos
    const warningTimeout = setTimeout(() => {
      if (waitingForNova) {
        logger.warn('⏰ Nova no ha respondido en 10 segundos');
        logTimeout();
        setError(language === 'es'
          ? 'Nova está tardando un poco en responder…'
          : 'Nova is taking a little while to respond…');
      }
    }, NOVA_RESPONSE_TIMEOUT);

    // Mensaje crítico a los 20 segundos
    const criticalTimeout = setTimeout(() => {
      if (waitingForNova) {
        logger.error('❌ Nova timeout crítico - 20 segundos sin respuesta');
        logError('Nova timeout crítico - 20s sin respuesta');
        setError(language === 'es'
          ? 'Nova no está respondiendo. Espera un momento o repite tu respuesta.'
          : 'Nova is not responding. Wait a moment or repeat your answer.');
      }
    }, NOVA_RESPONSE_TIMEOUT * 2);

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(criticalTimeout);
    };
  }, [waitingForNova, appState, language]);

  // Detector de pérdida de conexión
  useEffect(() => {
    const handleOnline = () => {
      logger.debug('🌐 Conexión restaurada');
      setIsOnline(true);

      if (connectionLostDuringSession && appState === 'ERROR') {
        setError(language === 'es'
          ? 'Volvió la conexión. Tu conversación está guardada: toca Reintentar para continuar.'
          : 'You are back online. Your conversation is saved: tap Try again to continue.');
        setConnectionLostDuringSession(false);
      }
    };

    const handleOffline = () => {
      logger.debug('⚠️ Conexión perdida');
      setIsOnline(false);

      // En modo TEXTO no se interrumpe nada: el aviso del encabezado basta y los mensajes
      // que no salgan se marcan para reenviar. En VOZ la conexión en vivo se corta.
      if (interviewModeRef.current === 'VOICE' && (appState === 'LISTENING' || appState === 'CONNECTING')) {
        setConnectionLostDuringSession(true);
        setError(language === 'es'
          ? 'Se perdió la conexión a internet. Tu conversación está guardada; cuando vuelva la conexión, toca Reintentar.'
          : 'The internet connection was lost. Your conversation is saved; when you are back online, tap Try again.');
        setAppState('ERROR');
        // cleanupAudio se declara más abajo; no va en las dependencias porque aún no existe
        // al renderizar, pero cuando corre este evento ya está definida
        cleanupAudio();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [appState, language, connectionLostDuringSession]);

  // Protección contra recarga accidental durante sesión activa
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
      // Solo durante la conversación: al generar el resumen la entrevista ya está guardada para el médico
      if (appState === 'LISTENING' && transcript.length > 0) {
        // Guardar checkpoint de emergencia (fire-and-forget, beforeunload es síncrono)
        if (user?.id && sessionId) {
          saveSessionCheckpoint(
            user.id,
            sessionId,
            patientName,
            language,
            appState,
            transcript,
            currentInputTranscription.current,
            currentOutputTranscription.current,
            sessionStartTime
          ).then(() => {
            logger.debug('💾 Checkpoint de emergencia guardado antes de salir');
          }).catch((err) => {
            logger.error('❌ Error guardando checkpoint de emergencia:', err);
          });
        }

        // Mostrar confirmación del navegador
        e.preventDefault();
        e.returnValue = ''; // Chrome requiere esto
        return ''; // Algunos navegadores requieren return value
      }
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [appState, transcript, user?.id, sessionId, patientName, language, sessionStartTime]);

  const handleLanguageChange = (lang: Language) => {
    // Allow language change only when not in an active session.
    if (['IDLE', 'COMPLETED', 'ERROR'].includes(appState)) {
      setLanguage(lang);
    }
  };

  const handleOpenMicrophoneDiagnostic = () => {
    setShowMicrophoneDiagnostic(true);
  };

  const handleCloseMicrophoneDiagnostic = () => {
    setShowMicrophoneDiagnostic(false);
  };

  // Cada arranque de chat lleva un número; si la persona vuelve atrás mientras conecta,
  // la respuesta que llegue tarde se ignora
  const textStartTokenRef = useRef(0);

  /** Envía a Nova un mensaje del paciente que ya está en pantalla y agrega la respuesta. */
  const deliverTextMessage = useCallback(async (messageId: string, text: string) => {
    if (!chatSessionRef.current) return;
    setWaitingForNova(true);
    setError(null);
    try {
      const responseText = await chatSessionRef.current.sendMessage(text);
      if (responseText.trim()) {
        // Procesar marcadores de temas y obtener texto limpio
        const cleanedText = processTopicMarker(responseText.trim());
        const novaMessage: TranscriptMessage = {
          id: generateUniqueId(),
          sender: 'Nova',
          text: cleanedText, // Texto sin marcador [[TEMAS:...]]
          lang: language,
          timestamp: new Date().toISOString(),
        };
        setTranscript(prev => [...prev, novaMessage]);
        logNovaResponse(0);
      }
    } catch (e) {
      logger.error('Error enviando mensaje de texto:', e);
      // El mensaje queda en pantalla marcado "No se envió" con su botón Reintentar
      setTranscript(prev => prev.map(m => (m.id === messageId ? { ...m, failed: true } : m)));
      if (isOpenAIBillingError(String((e as Error)?.message ?? e))) {
        setError(language === 'es'
          ? 'Nova no está disponible en este momento. Tu conversación está guardada; inténtalo de nuevo más tarde.'
          : 'Nova is not available right now. Your conversation is saved; please try again later.');
      }
    } finally {
      setWaitingForNova(false);
    }
  }, [language, processTopicMarker]);

  // Modo TEXTO: GPT-6.1 Terra vía Edge Function (HTTP), no Live API
  const handleSendTextMessage = useCallback(async (text: string) => {
    if (!chatSessionRef.current || !text.trim()) return;
    const userMessage: TranscriptMessage = {
      id: generateUniqueId(),
      sender: 'You',
      text: text.trim(),
      lang: language,
      timestamp: new Date().toISOString(),
    };
    setTranscript(prev => [...prev, userMessage]);
    await deliverTextMessage(userMessage.id, userMessage.text);
  }, [language, deliverTextMessage]);

  // Reenviar un mensaje que no llegó. Se mueve al final para que el orden en pantalla
  // coincida con el historial que recibe Nova.
  const handleRetryTextMessage = useCallback(async (messageId: string) => {
    const failedMessage = transcriptRef.current.find(m => m.id === messageId);
    if (!failedMessage || waitingForNova) return;
    const resent: TranscriptMessage = { ...failedMessage, failed: false, timestamp: new Date().toISOString() };
    setTranscript(prev => [...prev.filter(m => m.id !== messageId), resent]);
    await deliverTextMessage(resent.id, resent.text);
  }, [deliverTextMessage, waitingForNova]);

  const handleStartTextSession = useCallback(async () => {
    const token = ++textStartTokenRef.current;
    setAppState('CONNECTING');
    setError(null);
    setWaitingForNova(false);
    setInterviewEnded(false);
    setEndedTooShort(false);
    setSummaryGenerationFailed(false);

    // Resetear para nueva sesión
    reconnectAttemptsRef.current = 0;
    setTranscript([]);
    setSummary('');
    // El prefijo "text_" permite saber el modo al recuperar una entrevista interrumpida
    const newSessionId = `text_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    setSessionId(newSessionId);
    const startedAt = Date.now();
    setSessionStartTime(startedAt);
    resetMetrics();
    setCurrentModule('MODULE_1');
    setCompletedModules([]);
    setModuleTranscripts(createEmptyModuleTranscripts());
    resetTopicTracking();
    setLastSavedMessageCount(0);
    setLastCheckpointTime(null);

    try {
      // TEXT usa las instrucciones completas (sin módulos): una sola sesión continua.
      // La Edge Function agrega SYSTEM_INSTRUCTIONS[language] en el servidor.
      const chatSession = new TerraChatSession(language);
      const greetingText = await chatSession.sendMessage(getTextActivationMessage(language));
      if (token !== textStartTokenRef.current) return; // La persona salió mientras conectaba

      chatSessionRef.current = chatSession;
      if (greetingText.trim()) {
        const novaMessage: TranscriptMessage = {
          id: generateUniqueId(),
          sender: 'Nova',
          text: processTopicMarker(greetingText.trim()), // Texto sin marcador [[TEMAS:...]]
          lang: language,
          timestamp: new Date().toISOString(),
        };
        setTranscript([novaMessage]);
        logNovaResponse(0);
      }

      setAppState('LISTENING');
      sessionStartTimeRef.current = startedAt;
      logger.debug('✅ Sesión TEXT (GPT-6.1 Terra) iniciada correctamente');
    } catch (e: any) {
      if (token !== textStartTokenRef.current) return;
      logger.error('Error iniciando sesion TEXT:', e);
      setError(isOpenAIBillingError(String(e?.message ?? e))
        ? (language === 'es'
          ? 'Nova no está disponible en este momento. Inténtalo de nuevo más tarde.'
          : 'Nova is not available right now. Please try again later.')
        : (language === 'es'
          ? 'Revisa tu conexión a internet e inténtalo de nuevo.'
          : 'Check your internet connection and try again.'));
      setAppState('ERROR');
    }
  }, [language, processTopicMarker, resetTopicTracking]);

  // Elegir modo en la bienvenida: escribir arranca el chat de inmediato; hablar muestra
  // primero las indicaciones (el micrófono necesita que la persona toque "Empezar")
  const handleSelectMode = useCallback((mode: InterviewMode) => {
    savePatientProfile(user, { fullName: patientName.trim(), dateOfBirth: patientDob });
    setInterviewMode(mode);
    setError(null);
    logger.debug(`Modo de entrevista seleccionado: ${mode}`);
    if (mode === 'TEXT') handleStartTextSession();
  }, [user, patientName, patientDob, handleStartTextSession]);

  const cleanupAudio = useCallback(() => {
    // Cancelar interval de limpieza periódica de buffers
    if (bufferCleanupIntervalRef.current) {
      clearInterval(bufferCleanupIntervalRef.current);
      bufferCleanupIntervalRef.current = null;
    }

    // Cancelar animación
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    // Detener y limpiar buffers de audio de salida
    for (const sourceNode of outputSourcesRef.current) {
      try {
        sourceNode.stop();
      } catch (e) {
        // Puede que ya esté detenido
      }
    }
    outputSourcesRef.current.clear();

    // 🔧 FIX MEMORY LEAK: Limpiar arrays de audio acumulados
    // Estos arrays guardan TODOS los fragmentos de audio de la sesión
    // Sin limpiarlos, consultas largas (>30min) acumulan +200MB y crashean
    currentInputAudio.current = [];
    currentOutputAudio.current = [];

    // Desconectar nodos de audio
    audioWorkletNodeRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    analyserRef.current?.disconnect();

    // Limpiar referencias
    analyserRef.current = null;
    audioWorkletNodeRef.current = null;
    mediaStreamSourceRef.current = null;

    // Remove audio track ended listener
    if (audioTrackEndedHandlerRef.current) {
      audioTrackEndedHandlerRef.current.track.removeEventListener('ended', audioTrackEndedHandlerRef.current.handler);
      audioTrackEndedHandlerRef.current = null;
    }

    // Detener tracks de media stream
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    // Cerrar contextos de audio
    audioContextRef.current?.close().catch(() => { });
    audioContextRef.current = null;
    outputAudioContextRef.current?.close().catch(() => { });
    outputAudioContextRef.current = null;

    // Resetear frecuencia
    setAvgFrequency(0);
  }, []);

  // Manejar recuperación de sesión
  // Para retomar una entrevista por voz con el contexto de lo ya conversado
  const resumeVoiceRef = useRef<TranscriptMessage[] | null>(null);

  const handleRecoverSession = useCallback((session: RecoverableSession) => {
    const checkpoint = session.checkpoint;

    if (!validateCheckpoint(checkpoint)) {
      logger.error('Checkpoint inválido, no se puede recuperar');
      setShowRecoveryModal(false);
      return;
    }

    const mode: InterviewMode = checkpoint.session_id.startsWith('text_') ? 'TEXT' : 'VOICE';
    // Contar solo el tiempo que estuvo conversando, no el rato que estuvo fuera
    const activeMs = Math.max(0, checkpoint.last_checkpoint_time - checkpoint.session_start_time);
    const resumedStart = Date.now() - activeMs;

    setSessionId(checkpoint.session_id);
    if (checkpoint.patient_name) setPatientName(checkpoint.patient_name);
    setLanguage(checkpoint.language);
    setSessionStartTime(resumedStart);
    sessionStartTimeRef.current = resumedStart;
    setLastSavedMessageCount(checkpoint.message_count);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
    setInterviewEnded(false);
    setEndedTooShort(false);
    setSummaryGenerationFailed(false);
    setError(null);
    setShowRecoveryModal(false);
    setRecoverableSessions([]);

    if (mode === 'TEXT') {
      // Si lo último fue del paciente, Nova no alcanzó a responder: se ofrece reenviarlo
      const restored = checkpoint.transcript.map(m => ({ ...m }));
      const last = restored[restored.length - 1];
      if (last && last.sender === 'You') last.failed = true;
      setTranscript(restored);
      chatSessionRef.current = TerraChatSession.fromTranscript(checkpoint.language, getTextActivationMessage(checkpoint.language), restored);
      try {
        const savedTopics = localStorage.getItem(topicsStorageKey(checkpoint.session_id));
        if (savedTopics) loadTopicTracking(JSON.parse(savedTopics) as number[]);
        else resetTopicTracking();
      } catch {
        resetTopicTracking();
      }
      setInterviewMode('TEXT');
      setAppState('LISTENING');
    } else {
      setCurrentModule(checkpoint.current_module ?? 'MODULE_1');
      setCompletedModules(checkpoint.completed_modules ?? []);
      setModuleTranscripts(checkpoint.module_transcripts ?? createEmptyModuleTranscripts());
      setTranscript(checkpoint.transcript);
      setSessionResumptionHandle(null);
      resumeVoiceRef.current = checkpoint.transcript;
      setInterviewMode('VOICE');
      // El micrófono necesita un toque de la persona: se muestra "Continuar conversación"
      setAppState('IDLE');
    }
  }, [loadTopicTracking, resetTopicTracking]);

  // "Empezar una nueva": ya no se ofrecerá continuar las entrevistas interrumpidas
  const handleDismissRecovery = useCallback(async () => {
    if (user?.id && recoverableSessions.length > 0) {
      for (const session of recoverableSessions) {
        await clearCheckpoint(session.checkpoint.session_id, user.id);
      }
    }

    setShowRecoveryModal(false);
    setRecoverableSessions([]);
  }, [recoverableSessions, user?.id]);

  const handleEndSession = useCallback(async () => {
    // Double-check lock para prevenir race conditions con múltiples llamadas
    if (endSessionLockRef.current) return;
    // Adquirir lock inmediatamente antes de cualquier otra verificación
    endSessionLockRef.current = true;

    if (appStateRef.current !== 'LISTENING') {
      endSessionLockRef.current = false;
      return;
    }
    appStateRef.current = 'PROCESSING';
    setAppState('PROCESSING');
    // A partir de aquí se muestra la pantalla final
    setInterviewEnded(true);
    setEndedTooShort(false);
    setSummaryGenerationFailed(false);
    setError(null);

    if (sessionPromiseRef.current) {
      try {
        // Timeout de 5s para evitar UI congelada si WebSocket está colgado
        const session = await withTimeout(sessionPromiseRef.current, 5000);
        session.close();
      } catch (e) {
        logger.error("Error or timeout closing live session:", e);
      } finally {
        sessionPromiseRef.current = null;
      }
    }
    cleanupAudio();

    // Limpiar sesión de Chat API (TEXT mode)
    chatSessionRef.current = null;

    // Agregar transcripciones pendientes al transcript actual
    const currentModuleTranscript = [...transcript];
    if (currentInputTranscription.current.trim()) {
      currentModuleTranscript.push({
        id: generateUniqueId(),
        sender: 'You',
        text: currentInputTranscription.current.trim(),
        lang: language,
      });
    }
    if (currentOutputTranscription.current.trim()) {
      currentModuleTranscript.push({
        id: generateUniqueId(),
        sender: 'Nova',
        text: currentOutputTranscription.current.trim(),
        lang: language,
      });
    }

    // Combinar transcripts de todos los módulos completados + módulo actual
    let finalTranscript: TranscriptMessage[];
    if (completedModules.length > 0) {
      // Hay módulos completados - combinar todos
      const allModuleTranscripts = {
        ...moduleTranscripts,
        [currentModule]: currentModuleTranscript,
      };
      finalTranscript = mergeModuleTranscripts(allModuleTranscripts);
      logger.debug('📋 Combinando transcripts de', completedModules.length + 1, 'módulos para resumen');
    } else {
      // Solo un módulo (sin transiciones) - usar transcript actual
      finalTranscript = currentModuleTranscript;
    }

    setTranscript(finalTranscript);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';

    const fullTranscriptText = finalTranscript.map(t => `${t.sender === 'Nova' ? 'Nova' : (language === 'es' ? 'Tú' : 'You')}: ${t.text}`).join('\n');

    if (fullTranscriptText.trim().length < 50) {
      // Transcripción muy corta - establecer ERROR, no COMPLETED
      // Esto previene que el usuario intente enviar un resumen vacío/de error al doctor
      setEndedTooShort(true);
      setSummary('');
      setAppState('ERROR');
      endSessionLockRef.current = false; // Liberar lock antes de return temprano
      return;
    }

    // ============================================================
    // GENERACIÓN DE RESUMEN: GUARDAR PRIMERO, PROCESAR DESPUÉS
    // ============================================================

    // PASO 1: Guardar en pending_summaries INMEDIATAMENTE
    // La entrevista NUNCA se pierde a partir de aquí
    const sessionDuration = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      : 0;

    if (user?.id) {
      const saveResult = await savePendingSummaryWithRetry(
        user.id,
        sessionId,
        finalTranscript,
        language,
        patientName,
        sessionDuration
      );

      if (saveResult.success) {
        logger.debug('✅ Entrevista guardada en pending_summaries - datos seguros');
      } else {
        logger.warn('⚠️ No se pudo guardar en pending_summaries, continuando con localStorage backup');
      }
    }

    // Backup adicional en localStorage
    const backupKey = 'cabo_health_pending_transcript';
    try {
      localStorage.setItem(backupKey, JSON.stringify({
        transcript: finalTranscript,
        sessionId,
        patientName,
        language,
        timestamp: Date.now()
      }));
      logger.debug('💾 Transcript respaldado en localStorage');
    } catch (backupErr) {
      logger.warn('No se pudo respaldar transcript en localStorage:', backupErr);
    }

    // PASO 2: Configuración de reintentos con Gemini 3 Flash
    const MAX_SUMMARY_RETRIES = 3;
    const RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s
    const SUMMARY_TIMEOUT = 120000; // 120 segundos (Gemini 3 Flash es más rápido)

    let lastError: Error | null = null;
    let summaryGenerated = false;

    // Gemini es solo el respaldo de Terra: sin su llave se intenta únicamente Terra
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const ai = apiKey?.trim() ? new GoogleGenAI({ apiKey }) : null;
    let skipTerra = false;
    let terraOutOfCredits = false;

    for (let attempt = 0; attempt < MAX_SUMMARY_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug(`🔄 Reintento ${attempt + 1}/${MAX_SUMMARY_RETRIES} de generación de resumen...`);
          await incrementAttempts(sessionId);
        }

        // Marcar como processing en la cola
        if (user?.id) {
          await updateSummaryStatus(sessionId, 'processing');
        }

        // PASO 3: GPT-6.1 Terra (effort max) vía Edge Function; si falla, Gemini como respaldo.
        // Sin saldo o tras agotar su timeout, Terra no se reintenta (serían otros 20 minutos)
        let summaryText = '';
        if (!skipTerra) {
          try {
            summaryText = await generateSummaryWithTerra(fullTranscriptText, language);
          } catch (terraError) {
            logger.warn('GPT-6.1 Terra falló, usando Gemini como respaldo:', terraError);
            const terraMessage = terraError instanceof Error ? terraError.message : String(terraError);
            terraOutOfCredits = isOpenAIBillingError(terraMessage);
            skipTerra = terraOutOfCredits || terraMessage.startsWith('Timeout');
          }
        }

        if (!summaryText) {
          if (!ai) throw new Error('VITE_GEMINI_API_KEY no está configurada (respaldo de GPT-6.1 Terra)');
          let response;
          try {
            response = await withTimeout(
              ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: SUMMARY_PROMPT[language](fullTranscriptText),
                config: {
                  thinkingConfig: {
                    thinkingLevel: ThinkingLevel.HIGH, // Máxima calidad de razonamiento
                    includeThoughts: false // No necesitamos ver el thinking
                  },
                  maxOutputTokens: 16384
                }
              }),
              SUMMARY_TIMEOUT
            );
          } catch (gemini3Error) {
            // FALLBACK: Si Gemini 3.1 Pro falla, intentar con Gemini 3 Flash
            logger.warn('Gemini 3.1 Pro falló, intentando con Gemini 3 Flash como fallback');
            response = await withTimeout(
              ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: SUMMARY_PROMPT[language](fullTranscriptText),
                config: {
                  thinkingConfig: {
                    thinkingBudget: 0 // Sin thinking = máxima velocidad
                  },
                  maxOutputTokens: 16384
                }
              }),
              SUMMARY_TIMEOUT
            );
          }
          summaryText = response.text ?? '';
        }

        const sanitizedSummary = sanitizeHtml(summaryText);

        if (!sanitizedSummary || sanitizedSummary.trim().length < 50) {
          throw new Error('El resumen generado está vacío o es muy corto');
        }

        setSummary(sanitizedSummary);
        setAppState('COMPLETED');
        setSummaryGenerationFailed(false);
        summaryGenerated = true;

        // Marcar como completado en la cola
        if (user?.id) {
          await completeSummary(sessionId, sanitizedSummary);

          // AUTO-SAVE: Guardar en consultations inmediatamente
          // Esto garantiza que el doctor VEA la consulta aunque el paciente
          // no haga click en "Enviar al Doctor"
          autoSaveConsultation({
            userId: user.id,
            userEmail: user.email,
            sessionId,
            patientName,
            patientDob,
            transcript: finalTranscript,
            summary: sanitizedSummary,
            language,
            sessionDuration,
          }).catch(err => logger.warn('Auto-save to consultations failed (non-blocking):', err));
        }

        // Limpiar backup de localStorage
        try {
          localStorage.removeItem(backupKey);
          logger.debug('🗑️ Backup de localStorage eliminado (generación exitosa)');
        } catch (e) {
          // Ignorar error al limpiar
        }

        // Limpiar checkpoint, datos de módulos y temas guardados
        if (user?.id && sessionId) {
          await clearCheckpoint(sessionId, user.id);
          clearModuleData(sessionId);
        }
        try {
          localStorage.removeItem(topicsStorageKey(sessionId));
        } catch { /* ignorar */ }

        logger.debug(`✅ Resumen generado exitosamente${attempt > 0 ? ` (intento ${attempt + 1})` : ''}`);
        break;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.error(`❌ Error en intento ${attempt + 1}/${MAX_SUMMARY_RETRIES}:`, lastError.message);

        // Sin créditos (o sin nada más que intentar) reintentar solo hace esperar al usuario
        if (isGeminiBillingError(lastError.message) || (skipTerra && !ai)) break;

        if (attempt < MAX_SUMMARY_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt] ?? 5000;
          logger.debug(`⏳ Esperando ${delay / 1000}s antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // Si después de todos los reintentos no se generó el resumen
    if (!summaryGenerated && lastError) {
      logger.error('Summary generation failed after all retries:', lastError);
      const errorMessage = lastError.message;

      // Marcar como fallido en la cola (pero los datos están seguros!)
      if (user?.id) {
        await failSummary(sessionId, errorMessage);
      }

      // El paciente ve un mensaje simple en la pantalla final (su entrevista ya está con el médico).
      // El detalle técnico queda en los logs para el equipo.
      if (terraOutOfCredits) logger.error('Resumen: OpenAI sin saldo.', getOpenAIBillingMessage('es'));
      else if (isGeminiBillingError(errorMessage)) logger.error('Resumen: Gemini sin saldo.', getGeminiBillingMessage('es'));
      setError(null);
      setSummaryGenerationFailed(true);
      setAppState('ERROR');
    }

    // Liberar el lock al finalizar (éxito o error)
    endSessionLockRef.current = false;
  }, [transcript, language, cleanupAudio, user?.id, user?.email, sessionId, completedModules, moduleTranscripts, currentModule, patientName, patientDob]);

  /**
   * Maneja la transición entre módulos de la entrevista
   * 1. Guarda el transcript del módulo actual
   * 2. Cierra la conexión WebSocket actual
   * 3. Avanza al siguiente módulo
   * 4. Inicia nueva conexión con instrucciones del nuevo módulo
   */
  const handleModuleTransition = useCallback(async () => {
    const nextModule = getNextModule(currentModule);

    if (!nextModule) {
      // Ya estamos en el último módulo - finalizar entrevista
      logger.debug('📋 Último módulo completado, finalizando entrevista...');
      return;
    }

    logger.debug('🔄 Iniciando transición de módulo:', currentModule, '→', nextModule);
    setIsTransitioningModule(true);
    setNovaAskedTransition(false); // Resetear estado de transición por voz
    setError(null);

    try {
      // 1. Guardar transcript del módulo actual
      const updatedTranscripts = await saveModuleTranscript(
        user?.id || '',
        sessionId,
        currentModule,
        transcript,
        moduleTranscripts
      );
      setModuleTranscripts(updatedTranscripts);

      // 2. Marcar módulo actual como completado
      setCompletedModules(prev => [...prev, currentModule]);

      // 3. Cerrar conexión WebSocket actual apropiadamente
      if (sessionPromiseRef.current) {
        try {
          // Timeout de 5s para evitar UI congelada si WebSocket está colgado
          const session = await withTimeout(sessionPromiseRef.current, 5000);
          session.close();
        } catch (e) {
          logger.error('Error or timeout closing session during module transition:', e);
        } finally {
          sessionPromiseRef.current = null;
        }
      }
      cleanupAudio();
      setAppState('IDLE');

      // 4. Limpiar transcript para el nuevo módulo
      setTranscript([]);

      // 5. Avanzar al siguiente módulo
      setCurrentModule(nextModule);

      // 6. Marcar que necesitamos auto-iniciar el siguiente módulo
      pendingModuleStartRef.current = nextModule;

      // 7. Pequeña pausa para mostrar UI de transición
      await new Promise(resolve => setTimeout(resolve, 1500));

      logger.debug('✅ Módulo', currentModule, 'guardado. Listo para iniciar módulo', nextModule);

    } catch (error) {
      logger.error('Error en transición de módulo:', error);
      setError(language === 'es'
        ? 'Error al cambiar de módulo. Por favor, intenta de nuevo.'
        : 'Error transitioning modules. Please try again.');
      pendingModuleStartRef.current = null;
    } finally {
      setIsTransitioningModule(false);
    }
  }, [currentModule, transcript, moduleTranscripts, user?.id, sessionId, cleanupAudio, language]);

  const handleStartSession = useCallback(async () => {
    // Usar ref para obtener el valor actual del handle (evita stale closures)
    const currentHandle = sessionResumptionHandleRef.current;

    setAppState('CONNECTING');
    setError(null);
    setWaitingForNova(false); // Resetear estado de espera de Nova
    userSpokeAtRef.current = null;

    // Solo resetear transcript y summary si es sesión nueva (no reconexión ni transición de módulo)
    // Si hay currentHandle, estamos reconectando y mantenemos los datos
    // Si hay módulos completados, estamos en transición entre módulos
    const isModuleTransition = completedModules.length > 0;
    // Reconexión automática desde onclose: aunque no haya handle, NO es sesión nueva.
    // Sin esto se borraba el transcript y se reiniciaba el contador de intentos (bucle infinito)
    const isAutoReconnect = isReconnectingRef.current;
    // Retomar una conversación guardada (sesión recuperada o "Reintentar" tras un error)
    const resumeTranscript = resumeVoiceRef.current;
    const isResume = !!resumeTranscript && resumeTranscript.length > 0;

    if (!currentHandle && !isModuleTransition && !isAutoReconnect && !isResume) {
      // Sesión completamente nueva
      reconnectAttemptsRef.current = 0;
      setTranscript([]);
      setSummary('');
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      setSessionStartTime(Date.now());
      resetMetrics();
      setCurrentModule('MODULE_1');
      setCompletedModules([]);
      setModuleTranscripts(createEmptyModuleTranscripts());
    } else if (!currentHandle && (isModuleTransition || isResume) && !isAutoReconnect) {
      // Transición entre módulos o conversación retomada - mantener sessionId y datos anteriores
      reconnectAttemptsRef.current = 0;
      // transcript ya fue limpiado en handleModuleTransition
      // NO resetear sessionId, sessionStartTime, ni moduleTranscripts
      logger.debug('📋 Iniciando módulo', currentModule, 'manteniendo sessionId:', sessionId);
    } else {
      // Estamos reconectando - registrar reconexión
      logReconnect();
      logger.debug('🔄 Reconexión registrada en telemetría con handle');
    }

    // Resetear contadores de checkpoint
    setLastSavedMessageCount(0);
    setLastCheckpointTime(null);

    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('SECURE_CONTEXT_REQUIRED');
      }

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      if (outputAudioContextRef.current.state === 'suspended') {
        await outputAudioContextRef.current.resume();
      }

      playWelcomeSound(outputAudioContextRef.current, welcomeSoundEnabled);

      nextAudioStartTime.current = 0;
      outputSourcesRef.current.clear();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Detectar cuando el micrófono se desconecta
      // Fix: Validar que hay audio tracks antes de acceder al primer elemento
      const audioTracks = stream.getAudioTracks();
      const audioTrack = audioTracks.length > 0 ? audioTracks[0] : null;
      if (audioTrack) {
        const handleTrackEnded = () => {
          logger.debug('Micrófono desconectado');
          if (appStateRef.current === 'LISTENING') {
            const errorMsg = language === 'es'
              ? 'El micrófono se desconectó. Por favor reconecta tu micrófono y reinicia la sesión. Tu progreso está guardado.'
              : 'Microphone disconnected. Please reconnect your microphone and restart the session. Your progress is saved.';

            setError(errorMsg);
            setAppState('ERROR');
            cleanupAudio();
          }
        };
        audioTrack.addEventListener('ended', handleTrackEnded);
        // Store reference for cleanup
        audioTrackEndedHandlerRef.current = { track: audioTrack, handler: handleTrackEnded };
      }

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;

      await audioContextRef.current.audioWorklet.addModule(new URL('./audioProcessor.js', import.meta.url));
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
      audioWorkletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const pcmData = new Uint8Array(event.data);

        // Limitar tamaño del buffer para prevenir memory leak en sesiones largas
        if (currentInputAudio.current.length >= MAX_AUDIO_CHUNKS) {
          // Mantener solo los últimos 250 chunks (mitad del límite)
          currentInputAudio.current = currentInputAudio.current.slice(-250);
        }

        // Guardar audio para almacenamiento posterior
        currentInputAudio.current.push(pcmData);

        const pcmBlob = {
          data: encode(pcmData),
          mimeType: 'audio/pcm;rate=16000',
        };
        sessionPromiseRef.current?.then((session) => {
          try {
            session.sendRealtimeInput({ media: pcmBlob });
          } catch (e) {
            logger.error("Failed to send audio data:", e);
          }
        });
      };

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Throttle de actualización de frecuencia: 10 updates/seg en lugar de 60
      // Reduce re-renders de React en 83%, mejora rendimiento en dispositivos lentos
      let lastFrequencyUpdate = 0;

      const loop = () => {
        if (appStateRef.current !== 'LISTENING') return;

        const now = Date.now();
        if (now - lastFrequencyUpdate >= FREQUENCY_UPDATE_INTERVAL) {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          setAvgFrequency(sum / dataArray.length);
          lastFrequencyUpdate = now;
        }

        animationFrameRef.current = requestAnimationFrame(loop);
      };
      loop();

      // Limpieza periódica de buffers como seguro adicional contra memory leaks
      bufferCleanupIntervalRef.current = setInterval(() => {
        if (currentInputAudio.current.length > MAX_AUDIO_CHUNKS) {
          logger.debug('🧹 Limpieza periódica de buffer de input audio');
          currentInputAudio.current = currentInputAudio.current.slice(-250);
        }
        if (currentOutputAudio.current.length > MAX_AUDIO_CHUNKS) {
          logger.debug('🧹 Limpieza periódica de buffer de output audio');
          currentOutputAudio.current = currentOutputAudio.current.slice(-250);
        }
      }, 30000); // Cada 30 segundos

      // Vite solo expone variables con prefijo VITE_
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('VITE_GEMINI_API_KEY no está configurada en las variables de entorno');
      }
      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      // Log para debugging de configuraci��n de sesión
      logger.debug('🔧 Configurando sesión con:', {
        contextWindowCompression: 'enabled (slidingWindow)',
        sessionResumption: currentHandle ? 'reconnecting with handle' : 'new session',
        model: 'gemini-2.5-flash-native-audio-preview-09-2025'
      });

      // Determinar qué instrucciones usar basado en el módulo actual
      const moduleInstructions = getModuleInstructions(currentModule, language);
      logger.debug('📋 Usando instrucciones del módulo:', currentModule, 'hasGreeting:', MODULE_CONFIGS[currentModule].hasGreeting);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: moduleInstructions,
          // Context Window Compression para sesiones ilimitadas (sin esto: máx 15 min)
          // Ver: https://ai.google.dev/gemini-api/docs/live-session
          contextWindowCompression: { slidingWindow: {} },
          // Session Resumption para reconexión automática después de cortes
          // Tokens válidos por 2 horas después de terminación
          sessionResumption: currentHandle ? { handle: currentHandle } : {},
          // Parámetros adicionales requeridos para el modelo de audio nativo
          // Ver: https://github.com/googleapis/python-genai/issues/1710
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede'
              }
            }
          }
        } as any,
        callbacks: {
          onopen: () => {
            setAppState('LISTENING');
            resumeVoiceRef.current = null; // El contexto se manda una sola vez
            sessionStartTimeRef.current = Date.now(); // Marcar inicio para grace period
            source.connect(analyser);
            analyser.connect(workletNode);
            workletNode.connect(audioContextRef.current!.destination);
            logger.debug('🔌 Conexión WebSocket abierta, activando Nova...');

            // 🎙️ ACTIVACIÓN AUTOMÁTICA DE NOVA
            // Enviamos un mensaje de texto inicial para activar a Nova.
            // El mensaje varía según el módulo:
            // - Módulo 1: Saludo completo
            // - Módulos 2 y 3: Continúa directamente sin saludar
            setTimeout(() => {
              sessionPromiseRef.current?.then((session) => {
                try {
                  const moduleConfig = MODULE_CONFIGS[currentModule];
                  let activationMessage: string;

                  if (isResume && resumeTranscript) {
                    // Conversación retomada: Nova recibe lo último que se dijo y sigue sin saludar
                    activationMessage = buildVoiceResumeMessage(resumeTranscript, language);
                  } else if (currentHandle || isAutoReconnect) {
                    // Reconexión tras un corte: no volver a saludar
                    activationMessage = language === 'es'
                      ? '[Reconexión tras un corte - Continúa la entrevista donde se quedaron, SIN saludar de nuevo]'
                      : '[Reconnected after a drop - Continue the interview where you left off, WITHOUT greeting again]';
                  } else if (moduleConfig.hasGreeting) {
                    // Módulo 1: Saludo inicial
                    activationMessage = language === 'es'
                      ? '[Sesión iniciada - Por favor saluda al paciente]'
                      : '[Session started - Please greet the patient]';
                  } else {
                    // Módulos 2 y 3: Continuar sin saludo
                    activationMessage = language === 'es'
                      ? '[Continuación de entrevista - Continúa directamente con las preguntas de este módulo SIN saludar]'
                      : '[Interview continuation - Continue directly with this module questions WITHOUT greeting]';
                  }

                  session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: activationMessage }] }],
                    turnComplete: true
                  });
                  logger.debug('✅ Mensaje de activación enviado para módulo:', currentModule, 'hasGreeting:', moduleConfig.hasGreeting);
                } catch (e) {
                  logger.error('Error enviando mensaje de activación:', e);
                }
              });
            }, 500);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Manejar Session Resumption Update - guardar handle para reconexión
            // Esto es enviado por el servidor periódicamente cuando sessionResumption está habilitado
            if ((message as any).sessionResumptionUpdate) {
              const update = (message as any).sessionResumptionUpdate;
              logger.debug('📥 sessionResumptionUpdate recibido:', {
                resumable: update.resumable,
                hasNewHandle: !!update.newHandle,
                handleLength: update.newHandle?.length
              });
              if (update.resumable && update.newHandle) {
                setSessionResumptionHandle(update.newHandle);
                logger.debug('✅ Session resumption handle guardado exitosamente');
              }
            }

            // Manejar setupComplete - confirma que la sesión está lista
            if ((message as any).setupComplete) {
              logger.debug('✅ setupComplete: Sesión establecida correctamente con contextWindowCompression');
            }

            // Manejar GoAway - advertencia de cierre inminente (típicamente 60 segundos antes)
            if ((message as any).goAway) {
              const timeLeft = (message as any).goAway.timeLeft;
              logger.warn(`⚠️ GoAway recibido - Conexión terminará en: ${timeLeft}`);
              // Guardar checkpoint preventivo antes de la desconexión
              if (user?.id && sessionId && transcript.length > 0) {
                saveSessionCheckpoint(
                  user.id, sessionId, patientName, language, 'LISTENING',
                  transcript, currentInputTranscription.current, currentOutputTranscription.current, sessionStartTime
                ).catch(err => logger.error('Error guardando checkpoint preventivo:', err));
              }
            }

            if (message.serverContent?.outputTranscription) {
              // Nova está hablando - cancelar timeout inmediatamente
              if (waitingForNova) {
                if (userSpokeAtRef.current) {
                  const responseTime = Date.now() - userSpokeAtRef.current;
                  logNovaResponse(responseTime);
                  logger.debug(`🤖 Nova comenzó a responder en ${responseTime}ms`);
                }
                setWaitingForNova(false);
                setError(null); // Limpiar mensaje de timeout
              }
              currentOutputTranscription.current += message.serverContent.outputTranscription?.text ?? '';
            }
            if (message.serverContent?.inputTranscription) {
              const transcribedText = message.serverContent.inputTranscription?.text ?? '';

              // FILTRO MÍNIMO - Solo rechazar casos MUY CLAROS de idioma incorrecto
              // Preferimos incluir texto dudoso a perder información del paciente

              // Contar caracteres asiáticos
              const asianChars = (transcribedText.match(/[\u0E00-\u0E7F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0C80-\u0CFF]/g) ?? []).length;
              const totalChars = transcribedText.replace(/\s/g, '').length;
              const asianPercentage = totalChars > 0 ? (asianChars / totalChars) * 100 : 0;

              // SOLO rechazar si MÁS DEL 50% son caracteres asiáticos (muy conservador)
              if (asianPercentage > 50) {
                logger.warn('⛔ Transcripción rechazada (>50% caracteres asiáticos):', transcribedText.substring(0, 30) + '...');
                return;
              }

              // ACEPTAR TODO LO DEMÁS - incluyendo transcripciones que no detectemos como español/inglés
              // Razón: Es mejor tener texto "raro" que perder información del paciente
              currentInputTranscription.current += transcribedText;

              // Log para debug (solo si parece sospechoso pero lo aceptamos)
              if (asianPercentage > 20) {
                logger.debug('⚠️ Transcripción aceptada con caracteres inusuales:', transcribedText.substring(0, 50));
              }
            }
            if (message.serverContent?.turnComplete) {
              // Usar un flag local para evitar duplicados
              const inputText = currentInputTranscription.current.trim();
              const outputText = currentOutputTranscription.current.trim();

              // Tracking: Si el usuario habló, registrar timestamp ANTES de actualizar estado
              if (inputText) {
                userSpokeAtRef.current = Date.now();
                setWaitingForNova(true);
                logger.debug('👤 Usuario terminó de hablar, esperando a Nova...');
              }

              if (inputText || outputText) {
                setTranscript(prev => {
                  const newMessages: TranscriptMessage[] = [];

                  if (inputText) {
                    newMessages.push({
                      id: generateUniqueId(),
                      sender: 'You',
                      text: inputText,
                      lang: language,
                      timestamp: new Date().toISOString()
                    });
                    currentInputAudio.current = [];
                  }

                  if (outputText) {
                    newMessages.push({
                      id: generateUniqueId(),
                      sender: 'Nova',
                      text: outputText,
                      lang: language,
                      timestamp: new Date().toISOString()
                    });
                    currentOutputAudio.current = [];
                  }

                  return [...prev, ...newMessages];
                });

                // ============================================================
                // DETECCIÓN DE TRANSICIÓN AUTOMÁTICA POR VOZ
                // ============================================================
                // Frases que Nova usa para preguntar si continuamos
                const moduleTransitionPhrases = [
                  '¿te parece si continuamos',
                  '¿continuamos con',
                  '¿seguimos con',
                  'te parece si continuamos',
                  'continuamos con más',
                  'seguimos con la',
                  'shall we continue',
                  'ready to continue',
                  'continue with'
                ];

                // Respuestas afirmativas del usuario
                const affirmativeResponses = [
                  'sí', 'si', 'claro', 'adelante', 'ok', 'está bien', 'esta bien',
                  'por supuesto', 'dale', 'va', 'bueno', 'perfecto', 'listo',
                  'yes', 'sure', 'okay', 'go ahead', 'let\'s continue', 'of course',
                  'absolutely', 'yeah', 'yep', 'right'
                ];

                const outputLower = outputText.toLowerCase();
                const inputLower = inputText.toLowerCase();

                // Detectar si Nova preguntó sobre transición (solo en módulos 1 y 2)
                if (outputText && currentModule !== 'MODULE_3') {
                  const isAskingTransition = moduleTransitionPhrases.some(phrase =>
                    outputLower.includes(phrase)
                  );
                  if (isAskingTransition) {
                    logger.debug('🔄 Nova preguntó transición de módulo');
                    setNovaAskedTransition(true);
                  }
                }

                // Detectar respuesta afirmativa del usuario si Nova preguntó transición
                if (inputText && novaAskedTransitionRef.current) {
                  const isAffirmative = affirmativeResponses.some(response =>
                    inputLower.includes(response)
                  );
                  if (isAffirmative) {
                    logger.debug('✅ Usuario confirmó transición de módulo');
                    setNovaAskedTransition(false);
                    // Pequeña pausa para que el audio termine, luego transicionar
                    setTimeout(() => {
                      if (appStateRef.current === 'LISTENING' && !isTransitioningModule) {
                        logger.debug('🚀 Iniciando transición automática de módulo');
                        handleModuleTransition();
                      }
                    }, 2000);
                  }
                }
                // ============================================================
              }

              // Limpiar refs inmediatamente después de agregar al transcript
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            // Fix: Usar optional chaining también en el acceso al índice del array
            const audioDataB64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioDataB64 && outputAudioContextRef.current) {
              // Tracking: Nova está respondiendo - registrar tiempo de respuesta
              if (waitingForNova && userSpokeAtRef.current) {
                const responseTime = Date.now() - userSpokeAtRef.current;
                logNovaResponse(responseTime);
                logger.debug(`🤖 Nova respondió en ${responseTime}ms`);
              }
              setWaitingForNova(false);
              setError(null); // Limpiar cualquier mensaje de timeout anterior

              const audioContext = outputAudioContextRef.current;
              nextAudioStartTime.current = Math.max(
                nextAudioStartTime.current,
                audioContext.currentTime
              );
              const audioBytes = decode(audioDataB64);
              const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
              const sourceNode = audioContext.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(audioContext.destination);
              sourceNode.start(nextAudioStartTime.current);
              nextAudioStartTime.current += audioBuffer.duration;
              outputSourcesRef.current.add(sourceNode);
              sourceNode.onended = () => {
                outputSourcesRef.current.delete(sourceNode);
              };
            }

            if (message.serverContent?.interrupted) {
              for (const sourceNode of outputSourcesRef.current) {
                sourceNode.stop();
              }
              outputSourcesRef.current.clear();
              nextAudioStartTime.current = outputAudioContextRef.current?.currentTime || 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            logger.error('Live session connection error:', e);
            const errorMessage = e.message || String(e);

            // Mensajes para el paciente; el detalle técnico queda en los logs
            const es = language === 'es';
            let userErrorMessage: string;
            if (isGeminiBillingError(errorMessage)) {
              logger.error('Voz: Gemini sin saldo.', getGeminiBillingMessage('es'));
              userErrorMessage = es
                ? 'La conversación por voz no está disponible en este momento. Puedes responder por escrito.'
                : 'Voice conversation is not available right now. You can answer in writing.';
            } else if (/\b(401|403)\b|api key|apikey|unauthori[sz]ed|authentication|leaked/i.test(errorMessage)) {
              logger.error('Voz: la llave de Gemini fue rechazada (revisar VITE_GEMINI_API_KEY).', errorMessage);
              userErrorMessage = es
                ? 'La conversación por voz no está disponible en este momento. Puedes responder por escrito.'
                : 'Voice conversation is not available right now. You can answer in writing.';
            } else if (/429|quota|rate limit/i.test(errorMessage)) {
              userErrorMessage = es
                ? 'Hay mucha demanda en este momento. Espera un par de minutos y toca Reintentar.'
                : 'There is high demand right now. Wait a couple of minutes and tap Try again.';
            } else {
              userErrorMessage = es
                ? 'Se perdió la conexión con Nova. Revisa tu internet y toca Reintentar.'
                : 'The connection with Nova was lost. Check your internet and tap Try again.';
            }

            setError(userErrorMessage);
            setAppState('ERROR');
            cleanupAudio();
          },
          onclose: (e: CloseEvent) => {
            // Prevenir múltiples reconexiones simultáneas (race condition)
            if (isReconnectingRef.current) {
              logger.debug('⏳ Reconexión ya en progreso, ignorando onclose duplicado');
              return;
            }

            // Usar ref para obtener el valor actual (evita stale closure)
            const currentHandle = sessionResumptionHandleRef.current;
            logger.debug('Session closed by server:', e.code, e.reason, {
              appState: appStateRef.current,
              hasHandle: !!currentHandle,
              reconnectAttempts: reconnectAttemptsRef.current
            });

            // Sin créditos reconectar no sirve: el servidor volverá a cerrar con el mismo error
            const isBillingClose = isGeminiBillingError(e.reason || '');

            // Solo intentar reconexión si estamos en sesión activa y no hemos excedido intentos
            // NOTA: Intentamos reconectar incluso sin handle (comenzará nueva sesión pero mantiene transcript)
            if (appStateRef.current === 'LISTENING' && !isBillingClose &&
              reconnectAttemptsRef.current < maxReconnectAttempts) {

              // Marcar que estamos reconectando para prevenir race conditions
              isReconnectingRef.current = true;

              const hasHandle = !!currentHandle;
              logger.debug(`🔄 Intentando reconexión automática (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})${hasHandle ? ' con handle' : ' sin handle'}...`);
              reconnectAttemptsRef.current++;

              // Limpiar audio pero mantener estado de sesión
              cleanupAudio();

              // Mostrar mensaje de reconexión al usuario
              setError(language === 'es'
                ? 'Se cortó la conexión. Reconectando…'
                : 'The connection dropped. Reconnecting…');

              // Reintentar conexión después de 1 segundo
              setTimeout(() => {
                if (appStateRef.current !== 'COMPLETED') {
                  handleStartSession().catch((err) => {
                    logger.error('Reconnection failed:', err);
                  }).finally(() => {
                    isReconnectingRef.current = false; // Liberar flag de reconexión
                  });
                } else {
                  isReconnectingRef.current = false;
                }
              }, 1000);

            } else if (appStateRef.current === 'LISTENING' || (isBillingClose && appStateRef.current === 'CONNECTING')) {
              // Excedimos intentos (o no hay créditos) - mostrar error final
              const errorMsg = isBillingClose
                ? (language === 'es'
                  ? 'La conversación por voz no está disponible en este momento.'
                  : 'Voice conversation is not available right now.')
                : language === 'es'
                  ? 'Se cortó la conexión con Nova. Toca Reintentar para continuar.'
                  : 'The connection with Nova dropped. Tap Try again to continue.';

              setError(errorMsg);
              setAppState('ERROR');
              cleanupAudio();

              // Guardar checkpoint de emergencia (refs: este callback se creó al conectar,
              // el state capturado aquí tendría el transcript vacío y sobrescribiría el checkpoint bueno)
              if (user?.id && sessionIdRef.current && transcriptRef.current.length > 0) {
                saveSessionCheckpoint(
                  user.id,
                  sessionIdRef.current,
                  patientName,
                  language,
                  'LISTENING', // Mantener como LISTENING para recuperación
                  transcriptRef.current,
                  currentInputTranscription.current,
                  currentOutputTranscription.current,
                  sessionStartTime
                ).catch(err => logger.error('Error guardando checkpoint de emergencia:', err));
              }
            }
          },
        }
      });

    } catch (err) {
      logger.error('Failed to start session:', err);
      const es = language === 'es';
      let userMessage = es
        ? 'No pudimos usar el micrófono. Revisa que esté conectado y que el navegador tenga permiso.'
        : 'We could not use the microphone. Check that it is connected and that the browser has permission.';

      if (err instanceof Error) {
        if (err.message === 'SECURE_CONTEXT_REQUIRED') {
          logger.error('Voz: se necesita HTTPS para usar el micrófono.');
          userMessage = es
            ? 'La conversación por voz no está disponible en esta página. Puedes responder por escrito.'
            : 'Voice conversation is not available on this page. You can answer in writing.';
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userMessage = es
            ? 'Tu navegador bloqueó el micrófono. Toca el candado junto a la dirección de la página, permite el micrófono y vuelve a intentarlo.'
            : 'Your browser blocked the microphone. Tap the lock next to the page address, allow the microphone and try again.';
        } else if (err.name === 'NotFoundError') {
          userMessage = es
            ? 'No encontramos un micrófono. Conecta uno (o unos audífonos con micrófono) y vuelve a intentarlo.'
            : 'We could not find a microphone. Connect one (or headphones with a mic) and try again.';
        } else if (err.name === 'NotReadableError' || err.message.includes('in use')) {
          userMessage = es
            ? 'Otra aplicación está usando el micrófono (por ejemplo, una videollamada). Ciérrala y vuelve a intentarlo.'
            : 'Another app is using the microphone (for example, a video call). Close it and try again.';
        } else if (err.message.includes('VITE_GEMINI_API_KEY')) {
          userMessage = es
            ? 'La conversación por voz no está disponible en este momento. Puedes responder por escrito.'
            : 'Voice conversation is not available right now. You can answer in writing.';
        }
      }

      setError(userMessage ?? 'An error occurred');
      setAppState('ERROR');
      cleanupAudio();
    }
  }, [language, cleanupAudio, handleEndSession, currentModule, completedModules, sessionId]); // sessionResumptionHandle accedido via ref, currentModule para instrucciones de módulo

  // Auto-iniciar sesión después de transición de módulo (debe estar DESPUÉS de handleStartSession)
  useEffect(() => {
    if (shouldAutoStart && appState === 'IDLE') {
      setShouldAutoStart(false); // Resetear inmediatamente para evitar loops
      logger.debug('🚀 Auto-iniciando sesión para siguiente módulo');
      // Pequeño delay para que la UI se actualice
      const timer = setTimeout(() => {
        if (appStateRef.current === 'IDLE') {
          handleStartSession();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldAutoStart, appState, handleStartSession]);

  // Volver a la bienvenida para una entrevista nueva (el nombre y la fecha se conservan)
  const handleNewSession = useCallback(() => {
    cleanupAudio();
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(err => logger.error('Error closing session:', err));
      sessionPromiseRef.current = null;
    }
    textStartTokenRef.current++; // Ignorar un chat que estuviera conectando
    chatSessionRef.current = null;
    resumeVoiceRef.current = null;
    setAppState('IDLE');
    setTranscript([]);
    setSummary('');
    setError(null);
    setWaitingForNova(false);
    setInterviewEnded(false);
    setEndedTooShort(false);
    setSummaryGenerationFailed(false);
    resetTopicTracking();
    // Limpiar handle de resumption para nueva sesión
    setSessionResumptionHandle(null);
    reconnectAttemptsRef.current = 0;
    // Resetear estado de módulos para nueva sesión
    setCurrentModule('MODULE_1');
    setCompletedModules([]);
    setModuleTranscripts(createEmptyModuleTranscripts());
    setNovaAskedTransition(false);
    setShouldAutoStart(false); // Resetear estado de auto-start
    setInterviewMode(null); // Resetear modo de entrevista para mostrar la bienvenida
  }, [cleanupAudio, resetTopicTracking]);

  // Salir sin enviar: casi no hubo conversación, así que no debe llegarle al médico
  const handleDiscardSession = useCallback(async () => {
    const discardedSessionId = sessionId;
    handleNewSession();
    if (!user?.id || !discardedSessionId) return;
    try {
      await clearCheckpoint(discardedSessionId, user.id);
      clearModuleData(discardedSessionId);
      localStorage.removeItem(topicsStorageKey(discardedSessionId));
      await supabase.from('pending_summaries').delete().eq('session_id', discardedSessionId).eq('user_id', user.id);
    } catch (e) {
      logger.warn('No se pudo limpiar la sesión descartada:', e);
    }
  }, [sessionId, user?.id, handleNewSession]);

  // "Prefiero escribir" desde la pantalla de voz (solo antes de empezar a conversar)
  const handleSwitchToText = useCallback(() => {
    cleanupAudio();
    resumeVoiceRef.current = null;
    setInterviewMode('TEXT');
    handleStartTextSession();
  }, [cleanupAudio, handleStartTextSession]);

  const handleRetryConnection = useCallback(() => {
    // Limpiar error y volver a estado IDLE manteniendo el progreso
    cleanupAudio();
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(err => logger.error('Error closing session:', err));
      sessionPromiseRef.current = null;
    }
    setError(null);
    setAppState('IDLE');
    // Resetear intentos para permitir nuevos reintentos manuales
    reconnectAttemptsRef.current = 0;
    // NO limpiar transcript, patientName, sessionId, ni sessionResumptionHandle para mantener progreso.
    // Si no hay handle de Gemini, Nova recibirá lo último que se dijo para seguir sin saludar.
    if (transcriptRef.current.length > 0 && !sessionResumptionHandleRef.current) {
      resumeVoiceRef.current = transcriptRef.current;
    }
  }, [cleanupAudio]);

  // Función para reintentar la generación del resumen sin perder el transcript
  const handleRetryGenerateSummary = useCallback(async () => {
    // Verificar que hay transcript para procesar
    if (transcript.length === 0) return;

    logger.debug('🔄 Reintentando generación de resumen con transcript existente...');
    setAppState('PROCESSING');
    setError(null);
    setSummaryGenerationFailed(false);

    const fullTranscriptText = transcript.map(t =>
      `${t.sender === 'Nova' ? 'Nova' : (language === 'es' ? 'Tú' : 'You')}: ${t.text}`
    ).join('\n');

    if (fullTranscriptText.trim().length < 50) {
      setError(language === 'es'
        ? 'La conversación es demasiado breve para generar un resumen clínico.'
        : 'The conversation is too brief to generate a clinical summary.');
      setSummaryGenerationFailed(true);
      setAppState('ERROR');
      return;
    }

    // Configuración de reintentos
    const MAX_SUMMARY_RETRIES = 3;
    const RETRY_DELAYS = [2000, 5000, 10000];
    const SUMMARY_TIMEOUT = 90000;

    let lastError: Error | null = null;
    let summaryGenerated = false;
    let skipTerra = false;
    let terraOutOfCredits = false;

    // Gemini es solo el respaldo de Terra
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const ai = apiKey?.trim() ? new GoogleGenAI({ apiKey }) : null;

    for (let attempt = 0; attempt < MAX_SUMMARY_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug(`🔄 Reintento ${attempt + 1}/${MAX_SUMMARY_RETRIES}...`);
        }

        // GPT-6.1 Terra (effort max) primero; Gemini como respaldo.
        // Sin saldo o tras agotar su timeout, Terra no se reintenta
        let summaryText = '';
        if (!skipTerra) {
          try {
            summaryText = await generateSummaryWithTerra(fullTranscriptText, language);
          } catch (terraError) {
            logger.warn('GPT-6.1 Terra falló, usando Gemini como respaldo:', terraError);
            const terraMessage = terraError instanceof Error ? terraError.message : String(terraError);
            terraOutOfCredits = isOpenAIBillingError(terraMessage);
            skipTerra = terraOutOfCredits || terraMessage.startsWith('Timeout');
          }
        }

        if (!summaryText) {
          if (!ai) throw new Error('VITE_GEMINI_API_KEY no está configurada (respaldo de GPT-6.1 Terra)');

          const response = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.1-pro-preview',
              contents: SUMMARY_PROMPT[language](fullTranscriptText),
            }),
            SUMMARY_TIMEOUT
          );
          summaryText = response.text ?? '';
        }

        const sanitizedSummary = sanitizeHtml(summaryText);

        if (!sanitizedSummary || sanitizedSummary.trim().length < 50) {
          throw new Error('El resumen generado está vacío o es muy corto');
        }

        setSummary(sanitizedSummary);
        setAppState('COMPLETED');
        setSummaryGenerationFailed(false);
        summaryGenerated = true;

        // Limpiar backup
        try {
          localStorage.removeItem('cabo_health_pending_transcript');
        } catch (e) { /* ignorar */ }

        // Limpiar checkpoint
        if (user?.id && sessionId) {
          await clearCheckpoint(sessionId, user.id);
          clearModuleData(sessionId);
        }

        logger.debug(`✅ Resumen regenerado exitosamente${attempt > 0 ? ` (intento ${attempt + 1})` : ''}`);

        // Auto-save to consultations table
        if (user?.id) {
          try {
            await autoSaveConsultation({
              userId: user.id,
              userEmail: user.email,
              sessionId,
              patientName,
              patientDob,
              transcript,
              summary: sanitizedSummary,
              language,
              sessionDuration: sessionStartTimeRef.current ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000) : 0,
            });
          } catch (saveError) {
            logger.error('Error auto-saving after retry:', saveError);
          }
        }

        // Complete in summary queue
        if (user?.id && sessionId) {
          await completeSummary(sessionId, sanitizedSummary);
        }

        break;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.error(`❌ Error en intento ${attempt + 1}:`, lastError.message);

        if (isGeminiBillingError(lastError.message) || (skipTerra && !ai)) break;

        if (attempt < MAX_SUMMARY_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt] ?? 5000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    if (!summaryGenerated && lastError) {
      // La pantalla final explica al paciente que su entrevista ya está con el médico
      if (terraOutOfCredits) logger.error('Resumen: OpenAI sin saldo.', getOpenAIBillingMessage('es'));
      else if (isGeminiBillingError(lastError.message)) logger.error('Resumen: Gemini sin saldo.', getGeminiBillingMessage('es'));
      setError(null);
      setSummaryGenerationFailed(true);
      setAppState('ERROR');
    }
  }, [transcript, language, user?.id, user?.email, sessionId, patientName, patientDob]);

  const showFinish = interviewEnded && (appState === 'PROCESSING' || appState === 'COMPLETED' || appState === 'ERROR');
  const interviewInProgress = (appState === 'LISTENING' || appState === 'CONNECTING') && transcript.length > 0;
  // En modo texto el chat ocupa la pantalla y solo se desplazan los mensajes
  const fullHeightChat = interviewMode === 'TEXT' && !showFinish;
  const patientMessageCount = transcript.filter(m => m.sender === 'You' && !m.failed).length;

  const overlayFallback = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
    </div>
  );

  return (
    <div className={`flex flex-col bg-brand-cream text-slate-800 ${fullHeightChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <Header
        language={language}
        welcomeSoundEnabled={welcomeSoundEnabled}
        onToggleWelcomeSound={handleToggleWelcomeSound}
        isOnline={isOnline}
        userRole="patient"
        interviewInProgress={interviewInProgress}
      />

      {showRecoveryModal && recoverableSessions.length > 0 && (
        <ErrorBoundary>
          <Suspense fallback={overlayFallback}>
            <SessionRecoveryModal
              sessions={recoverableSessions}
              onRecover={handleRecoverSession}
              onDismiss={handleDismissRecovery}
              language={language}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {showMicrophoneDiagnostic && (
        <ErrorBoundary>
          <Suspense fallback={overlayFallback}>
            <MicrophoneDiagnostic language={language} onClose={handleCloseMicrophoneDiagnostic} />
          </Suspense>
        </ErrorBoundary>
      )}

      <main
        id="main-content"
        className={fullHeightChat ? 'flex min-h-0 flex-1 flex-col sm:px-6 sm:py-4' : 'flex-1'}
      >
        <ErrorBoundary>
          {showFinish ? (
            <FinishScreen
              language={language}
              appState={appState}
              patientName={patientName}
              transcript={transcript}
              summaryFailed={summaryGenerationFailed}
              tooShort={endedTooShort}
              onRetrySummary={handleRetryGenerateSummary}
              onNewInterview={handleNewSession}
            />
          ) : !interviewMode ? (
            <WelcomeScreen
              language={language}
              onLanguageChange={handleLanguageChange}
              patientName={patientName}
              onPatientNameChange={setPatientName}
              patientDob={patientDob}
              onPatientDobChange={setPatientDob}
              onSelectMode={handleSelectMode}
              voiceAvailable={voiceAvailable}
            />
          ) : interviewMode === 'TEXT' ? (
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
              <TextChatPanel
                language={language}
                transcript={transcript}
                onSendMessage={handleSendTextMessage}
                onRetryMessage={handleRetryTextMessage}
                onEndSession={handleEndSession}
                onDiscardSession={handleDiscardSession}
                onStartSession={handleStartTextSession}
                onBackToWelcome={handleNewSession}
                appState={appState}
                isProcessing={waitingForNova}
                error={error}
                onDismissError={() => setError(null)}
                patientName={patientName}
                sessionStartTime={sessionStartTime}
                topicTracking={topicTracking}
                topicsComplete={topicsComplete}
              />
            </div>
          ) : (
            <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:py-8">
              <ControlPanel
                appState={appState}
                language={language}
                onStartSession={handleStartSession}
                onEndSession={handleEndSession}
                onDiscardSession={handleDiscardSession}
                audioFrequency={avgFrequency}
                error={error}
                onOpenDiagnostic={handleOpenMicrophoneDiagnostic}
                onRetry={handleRetryConnection}
                waitingForNova={waitingForNova}
                currentModule={currentModule}
                completedModules={completedModules}
                isTransitioningModule={isTransitioningModule}
                hasConversation={transcript.length > 0}
                patientMessageCount={patientMessageCount}
                sessionStartTime={sessionStartTime}
                onSwitchToText={handleSwitchToText}
                onBackToWelcome={handleNewSession}
              />
              {(transcript.length > 0 || appState === 'LISTENING') && (
                <TranscriptionPanel transcript={transcript} appState={appState} language={language} patientName={patientName} />
              )}
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

// FIX: Added default export for the App component.
export default App;
