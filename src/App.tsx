
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel } from '@google/genai';
import { type AppState, type Language, type TranscriptMessage, type RecoverableSession, type InterviewModule, type InterviewMode } from './types';
import { UI_TEXTS, SUMMARY_PROMPT, getModuleInstructions, getNextModule, MODULE_CONFIGS, SYSTEM_INSTRUCTIONS } from './constants';
import { encode, decode, decodeAudioData, concatenateUint8Arrays } from './utils/audioUtils';
import { sanitizeHtml } from './utils/sanitizeHtml';
import { uploadAudioFragmentWav } from './utils/audioStorage';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import ModeSelector from './components/ModeSelector';
import TextChatPanel from './components/TextChatPanel';
import TranscriptionPanel from './components/TranscriptionPanel';
import ProgressIndicator from './components/ProgressIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import { playWelcomeSound } from './services/audioService';
import { logger } from './lib/logger';
import { useTopicTracking } from './hooks/useTopicTracking';
import { resetMetrics, logNovaResponse, logTimeout, logError, logReconnect } from './lib/sessionTelemetry';

// Lazy loading de componentes no críticos para mejorar performance inicial
const SessionRecoveryModal = lazy(() => import('./components/SessionRecoveryModal'));
const MicrophoneDiagnostic = lazy(() => import('./components/MicrophoneDiagnostic'));
const DoctorDashboard = lazy(() => import('./components/DoctorDashboard'));
const SummaryPanel = lazy(() => import('./components/SummaryPanel'));
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

const App: React.FC = () => {
  const { user, userRole, loading } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
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
          <p className="text-slate-600">Cargando...</p>
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
  const [language, setLanguage] = useState<Language>('en');
  const [patientName, setPatientName] = useState('');
  const [interviewMode, setInterviewMode] = useState<InterviewMode | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [avgFrequency, setAvgFrequency] = useState(0);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [summaryGenerationFailed, setSummaryGenerationFailed] = useState(false); // Para mostrar botón "Regenerar Resumen"
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
  const chatSessionRef = useRef<any>(null); // Sesión de chat para modo TEXT (API regular, no Live API)

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

  // ============================================================
  // PROTECCIÓN: beforeunload - Advertir al cerrar pestaña durante entrevista
  // ============================================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appState === 'LISTENING' || appState === 'PROCESSING') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [appState]);

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

  useEffect(() => {
    // Vite solo expone variables con prefijo VITE_
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      setApiKeyError(UI_TEXTS[language]?.errorApiKey ?? 'API key error');
    } else {
      setApiKeyError(null);
    }
  }, [language]);

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
          sessionStartTime
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
  }, [transcript.length, appState, user?.id, sessionId, patientName, language, sessionStartTime, lastSavedMessageCount]);

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
            ? 'No detectamos audio desde hace 1 minuto. ¿Está funcionando tu micrófono? Puedes ejecutar un diagnóstico.'
            : 'No audio detected for 1 minute. Is your microphone working? You can run a diagnostic.';

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
          ? '⏳ Nova está tardando en responder...'
          : '⏳ Nova is taking a while to respond...');
      }
    }, NOVA_RESPONSE_TIMEOUT);

    // Mensaje crítico a los 20 segundos
    const criticalTimeout = setTimeout(() => {
      if (waitingForNova) {
        logger.error('❌ Nova timeout crítico - 20 segundos sin respuesta');
        logError('Nova timeout crítico - 20s sin respuesta');
        setError(language === 'es'
          ? '⚠️ Nova no responde. Puedes usar "Reintentar Conexión"'
          : '⚠️ Nova is not responding. Try "Retry Connection"');
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
          ? '✅ Conexión restaurada. Tu progreso está guardado. Puedes intentar continuar.'
          : '✅ Connection restored. Your progress is saved. You can try to continue.');
        setConnectionLostDuringSession(false);
      }
    };

    const handleOffline = () => {
      logger.debug('⚠️ Conexión perdida');
      setIsOnline(false);

      if (appState === 'LISTENING' || appState === 'CONNECTING') {
        setConnectionLostDuringSession(true);
        setError(language === 'es'
          ? '⚠️ Se perdió la conexión a internet.\n\n📋 No te preocupes:\n• Tu progreso está guardado automáticamente\n• La sesión se pausará hasta que vuelva la conexión\n• Verifica tu conexión e intenta continuar'
          : '⚠️ Internet connection lost.\n\n📋 Don\'t worry:\n• Your progress is automatically saved\n• The session will pause until connection returns\n• Check your connection and try to continue');
        setAppState('ERROR');
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
      if ((appState === 'LISTENING' || appState === 'PROCESSING') && transcript.length > 0) {
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

  // Handler para seleccionar modo de entrevista
  const handleSelectMode = useCallback((mode: InterviewMode) => {
    setInterviewMode(mode);
    logger.debug(`Modo de entrevista seleccionado: ${mode}`);
  }, []);

  // Handler para enviar mensaje de texto en modo TEXT
  // Handler para enviar mensajes en modo TEXTO (usando Chat API, no Live API)
  const handleSendTextMessage = useCallback(async (text: string) => {
    if (!chatSessionRef.current || !text.trim()) return;

    // Agregar mensaje del usuario al transcript
    const userMessage: TranscriptMessage = {
      id: generateUniqueId(),
      sender: 'You',
      text: text.trim(),
      lang: language,
      timestamp: new Date().toISOString(),
    };
    setTranscript(prev => [...prev, userMessage]);
    setWaitingForNova(true);

    // Enviar a Gemini usando Chat API (HTTP request, no WebSocket)
    try {
      const response = await chatSessionRef.current.sendMessage({
        message: text.trim()
      });

      // Extraer texto de la respuesta
      const responseText = response.text ||
        response.candidates?.[0]?.content?.parts?.[0]?.text || '';

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

      logger.debug('📤 Mensaje TEXT enviado y respuesta recibida');
    } catch (e) {
      logger.error('Error enviando mensaje de texto:', e);
      setError(language === 'es'
        ? 'Error al enviar mensaje. Intenta de nuevo.'
        : 'Error sending message. Try again.');
    } finally {
      setWaitingForNova(false);
    }
  }, [language]);

  // Handler para iniciar sesión en modo TEXTO (usando Chat API, no Live API)
  // Esto es MUCHO más simple y estable que usar Live API para texto
  const handleStartTextSession = useCallback(async () => {
    setAppState('CONNECTING');
    setError(null);
    setWaitingForNova(false);

    // Resetear para nueva sesión
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
    resetTopicTracking(); // Resetear tracking de temas para nueva sesión

    setLastSavedMessageCount(0);
    setLastCheckpointTime(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('VITE_GEMINI_API_KEY no esta configurada');
      }

      const ai = new GoogleGenAI({ apiKey: apiKey as string });

      // TEXT mode uses COMPLETE instructions (no modules)
      // This is a single continuous session without transitions
      const fullInstructions = SYSTEM_INSTRUCTIONS[language];

      logger.debug('🔧 Configurando sesion de TEXTO con Chat API:', {
        mode: 'TEXT (Chat API) - Sesión continua sin módulos',
        model: 'gemini-3-flash-preview',
        api: 'chats.create (NO Live API)'
      });

      // Crear sesión de chat usando Chat API (NO Live API)
      // Esto es HTTP request/response, no WebSocket - mucho más estable
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: fullInstructions
        }
      });

      // Enviar mensaje de activación - siempre saluda (sesión única)
      const activationMessage = language === 'es'
        ? '[Sesión de TEXTO iniciada - Por favor saluda al paciente y comienza la entrevista completa]'
        : '[TEXT session started - Please greet the patient and begin the complete interview]';

      setWaitingForNova(true);

      const response = await chatSessionRef.current.sendMessage({
        message: activationMessage
      });

      // Extraer texto de la respuesta
      const greetingText = response.text ||
        response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (greetingText.trim()) {
        // Procesar marcadores de temas del saludo inicial
        const cleanedGreeting = processTopicMarker(greetingText.trim());

        const novaMessage: TranscriptMessage = {
          id: generateUniqueId(),
          sender: 'Nova',
          text: cleanedGreeting, // Texto sin marcador [[TEMAS:...]]
          lang: language,
          timestamp: new Date().toISOString(),
        };
        setTranscript([novaMessage]);
        logNovaResponse(0);
      }

      setAppState('LISTENING');
      sessionStartTimeRef.current = Date.now();
      setWaitingForNova(false);
      logger.debug('✅ Sesión TEXT (Chat API) iniciada correctamente');

    } catch (e: any) {
      logger.error('Error iniciando sesion TEXT:', e);
      setError(language === 'es'
        ? 'No se pudo conectar. Verifica tu conexion.'
        : 'Could not connect. Check your connection.');
      setAppState('ERROR');
      setWaitingForNova(false);
    }
  }, [currentModule, language]);

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
  const handleRecoverSession = useCallback((session: RecoverableSession) => {
    const checkpoint = session.checkpoint;

    // Validar checkpoint antes de recuperar
    if (!validateCheckpoint(checkpoint)) {
      logger.error('Checkpoint inválido, no se puede recuperar');
      setShowRecoveryModal(false);
      return;
    }

    // Restaurar estado de la sesión
    setSessionId(checkpoint.session_id);
    setPatientName(checkpoint.patient_name);
    setLanguage(checkpoint.language);
    setTranscript(checkpoint.transcript);
    setSessionStartTime(checkpoint.session_start_time);
    setLastSavedMessageCount(checkpoint.message_count);
    currentInputTranscription.current = checkpoint.current_input_transcription || '';
    currentOutputTranscription.current = checkpoint.current_output_transcription || '';

    setShowRecoveryModal(false);

    // Iniciar nueva sesión de audio con el contexto recuperado
    // El usuario deberá hacer clic en "Iniciar Sesión" manualmente
    setAppState('IDLE');
  }, []);

  // Manejar descarte de sesiones recuperables
  const handleDismissRecovery = useCallback(async () => {
    // Limpiar checkpoints de todas las sesiones recuperables
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
      setError(language === 'es'
        ? 'La conversación fue demasiado breve para generar un resumen clínico.'
        : 'The conversation was too brief to generate a clinical summary.');
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

    // Verificar API key una sola vez
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      setError(language === 'es'
        ? 'VITE_GEMINI_API_KEY no está configurada en las variables de entorno'
        : 'VITE_GEMINI_API_KEY is not configured in environment variables');
      setSummaryGenerationFailed(true);
      setAppState('ERROR');
      endSessionLockRef.current = false;
      return;
    }

    const ai = new GoogleGenAI({ apiKey: apiKey as string });

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

        // PASO 3: Usar Gemini 3 Flash con thinkingLevel: HIGH
        // 3x más rápido que 2.5 Pro, mejor calidad en benchmarks
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

        const sanitizedSummary = sanitizeHtml(response.text ?? '');

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

        // Limpiar checkpoint y datos de módulos
        if (user?.id && sessionId) {
          await clearCheckpoint(sessionId, user.id);
          clearModuleData(sessionId);
        }

        logger.debug(`✅ Resumen generado exitosamente con Gemini 3 Flash${attempt > 0 ? ` (intento ${attempt + 1})` : ''}`);
        break;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.error(`❌ Error en intento ${attempt + 1}/${MAX_SUMMARY_RETRIES}:`, lastError.message);

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

      // Manejo de errores específicos
      if (errorMessage.includes('VITE_GEMINI_API_KEY') || errorMessage.includes('401') || errorMessage.includes('403')) {
        setError(language === 'es'
          ? `Error de configuración: ${errorMessage}. Verifica tu archivo .env`
          : `Configuration error: ${errorMessage}. Check your .env file`);
        setApiKeyError(UI_TEXTS[language]?.errorApiKey ?? 'API key error');
      } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
        setError(language === 'es'
          ? 'La generación del resumen tardó demasiado. Tu entrevista está guardada, puedes intentar de nuevo.'
          : 'Summary generation took too long. Your interview is saved, you can try again.');
      } else if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('quota')) {
        setError(language === 'es'
          ? 'Demasiadas solicitudes a la API. Espera 1 minuto e intenta de nuevo.'
          : 'Too many API requests. Wait 1 minute and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        setError(language === 'es'
          ? 'Error de conexión a internet. Tu entrevista está guardada, verifica tu conexión e intenta de nuevo.'
          : 'Internet connection error. Your interview is saved, check your connection and try again.');
      } else if (errorMessage.includes('vacío') || errorMessage.includes('empty') || errorMessage.includes('corto')) {
        setError(language === 'es'
          ? 'El resumen generado fue inválido. Por favor, intenta de nuevo.'
          : 'Generated summary was invalid. Please try again.');
      } else {
        setError(language === 'es'
          ? `Error generando resumen: ${errorMessage.substring(0, 150)}. Tu entrevista está guardada, puedes intentar de nuevo.`
          : `Error generating summary: ${errorMessage.substring(0, 150)}. Your interview is saved, you can try again.`);
      }
      setSummaryGenerationFailed(true);
      setAppState('ERROR');
    }

    // Liberar el lock al finalizar (éxito o error)
    endSessionLockRef.current = false;
  }, [transcript, language, cleanupAudio, user?.id, sessionId, completedModules, moduleTranscripts, currentModule]);

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

    if (!currentHandle && !isModuleTransition) {
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
    } else if (!currentHandle && isModuleTransition) {
      // Transición entre módulos - mantener sessionId y datos de módulos anteriores
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

                  if (moduleConfig.hasGreeting) {
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

            // Detectar errores específicos y proporcionar pasos de solución
            let userErrorMessage = '';

            // Error de API key o API inválida (incluyendo falsos positivos de "leaked key")
            // Ver: https://github.com/googleapis/python-genai/issues/1710
            if (errorMessage.includes('API') || errorMessage.includes('api') || errorMessage.includes('Invalid') || errorMessage.includes('invalid') || errorMessage.includes('key') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('authentication') || errorMessage.includes('unauthorized') || errorMessage.includes('leaked')) {
              userErrorMessage = language === 'es'
                ? `❌ Error de autenticación con Gemini API\n\n📋 Pasos para arreglar:\n1. Genera una NUEVA API key en Google AI Studio\n2. Actualiza VITE_GEMINI_API_KEY en tu archivo .env o en Vercel\n3. Reinicia el servidor de desarrollo (pnpm dev)\n4. Recarga esta página\n\n⚠️ Nota: El modelo de audio nativo puede rechazar keys válidas incorrectamente.\nSi el problema persiste, contacta a soporte de Google AI.\n\nError: ${errorMessage.substring(0, 150)}`
                : `❌ Gemini API authentication error\n\n📋 Steps to fix:\n1. Generate a NEW API key in Google AI Studio\n2. Update VITE_GEMINI_API_KEY in your .env file or Vercel\n3. Restart the development server (pnpm dev)\n4. Reload this page\n\n⚠️ Note: The native audio model may incorrectly reject valid keys.\nIf the problem persists, contact Google AI support.\n\nError: ${errorMessage.substring(0, 150)}`;
              setApiKeyError(UI_TEXTS[language]?.errorApiKey ?? 'API key error');
            }
            // Error de rate limit
            else if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
              userErrorMessage = language === 'es'
                ? `⏰ Límite de uso de API alcanzado\n\n📋 Pasos:\n1. Espera unos minutos antes de reintentar\n2. Verifica tu cuota en Google AI Studio\n3. Considera actualizar tu plan de API\n\n💡 Las sesiones guardadas se pueden recuperar después`
                : `⏰ API usage limit reached\n\n📋 Steps:\n1. Wait a few minutes before retrying\n2. Check your quota in Google AI Studio\n3. Consider upgrading your API plan\n\n💡 Saved sessions can be recovered later`;
            }
            // Error de red
            else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
              userErrorMessage = language === 'es'
                ? `🌐 Error de conexión de red\n\n📋 Pasos:\n1. Verifica tu conexión a internet\n2. Intenta recargar la página\n3. Revisa si Google AI está accesible\n4. Usa el botón "Reintentar Conexión" abajo\n\n💡 Tu progreso está guardado automáticamente`
                : `🌐 Network connection error\n\n📋 Steps:\n1. Check your internet connection\n2. Try reloading the page\n3. Check if Google AI is accessible\n4. Use the "Retry Connection" button below\n\n💡 Your progress is automatically saved`;
            }
            // Error genérico
            else {
              userErrorMessage = language === 'es'
                ? `❌ ${UI_TEXTS[language].errorConnection}\n\n📋 Pasos:\n1. Usa el botón "Reintentar Conexión" abajo\n2. Si persiste, recarga la página\n3. Verifica tu conexión a internet\n4. Revisa la consola del navegador para más detalles\n\nError técnico: ${errorMessage.substring(0, 100)}`
                : `❌ ${UI_TEXTS[language].errorConnection}\n\n📋 Steps:\n1. Use the "Retry Connection" button below\n2. If it persists, reload the page\n3. Check your internet connection\n4. Check browser console for more details\n\nTechnical error: ${errorMessage.substring(0, 100)}`;
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

            // Solo intentar reconexión si estamos en sesión activa y no hemos excedido intentos
            // NOTA: Intentamos reconectar incluso sin handle (comenzará nueva sesión pero mantiene transcript)
            if (appStateRef.current === 'LISTENING' &&
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
                ? `🔄 Reconectando automáticamente... (intento ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
                : `🔄 Automatically reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

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

            } else if (appStateRef.current === 'LISTENING') {
              // Excedimos intentos - mostrar error final
              const errorMsg = language === 'es'
                ? 'La conexión se cerró inesperadamente. Tu progreso está guardado. Puedes usar "Reintentar Conexión" para continuar.'
                : 'Connection closed unexpectedly. Your progress is saved. You can use "Retry Connection" to continue.';

              setError(errorMsg);
              setAppState('ERROR');
              cleanupAudio();

              // Guardar checkpoint de emergencia
              if (user?.id && sessionId) {
                saveSessionCheckpoint(
                  user.id,
                  sessionId,
                  patientName,
                  language,
                  'LISTENING', // Mantener como LISTENING para recuperación
                  transcript,
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
      let userMessage = UI_TEXTS[language].errorMicGeneric;

      if (err instanceof Error) {
        // Error de contexto seguro (HTTPS requerido)
        if (err.message === 'SECURE_CONTEXT_REQUIRED') {
          userMessage = language === 'es'
            ? `🔒 Se requiere conexión segura (HTTPS)\n\n📋 Pasos para arreglar:\n1. En desarrollo: Usa https://localhost en lugar de http://\n2. O habilita vite con SSL: pnpm dev --https\n3. En producción: Despliega con HTTPS habilitado\n\n💡 ${UI_TEXTS[language].errorHttpsRequired}`
            : `🔒 Secure connection required (HTTPS)\n\n📋 Steps to fix:\n1. In development: Use https://localhost instead of http://\n2. Or enable vite with SSL: pnpm dev --https\n3. In production: Deploy with HTTPS enabled\n\n💡 ${UI_TEXTS[language].errorHttpsRequired}`;
        }
        // Error de permisos de micrófono
        else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userMessage = language === 'es'
            ? `🎤 Permiso de micrófono denegado\n\n📋 Pasos para arreglar:\n1. Haz clic en el ícono de candado/información en la barra de direcciones\n2. Busca "Permisos" o "Micrófono"\n3. Cambia a "Permitir"\n4. Recarga la página y vuelve a intentar\n\n💡 También puedes ejecutar un diagnóstico con el botón abajo`
            : `🎤 Microphone permission denied\n\n📋 Steps to fix:\n1. Click the lock/info icon in the address bar\n2. Look for "Permissions" or "Microphone"\n3. Change to "Allow"\n4. Reload the page and try again\n\n💡 You can also run a diagnostic with the button below`;
        }
        // Error de micrófono no encontrado
        else if (err.name === 'NotFoundError') {
          userMessage = language === 'es'
            ? `🔌 Micrófono no encontrado\n\n📋 Pasos para arreglar:\n1. Conecta un micrófono o auriculares con micrófono\n2. Verifica que esté enchufado correctamente\n3. En Windows: Revisa "Configuración > Sistema > Sonido"\n4. En Mac: Revisa "Preferencias > Sonido > Entrada"\n5. Recarga la página después de conectar\n\n💡 Ejecuta un diagnóstico con el botón abajo para más detalles`
            : `🔌 Microphone not found\n\n📋 Steps to fix:\n1. Connect a microphone or headphones with microphone\n2. Verify it's plugged in correctly\n3. On Windows: Check "Settings > System > Sound"\n4. On Mac: Check "Preferences > Sound > Input"\n5. Reload the page after connecting\n\n💡 Run a diagnostic with the button below for more details`;
        }
        // Error de micrófono en uso
        else if (err.name === 'NotReadableError' || err.message.includes('in use')) {
          userMessage = language === 'es'
            ? `⚠️ Micrófono en uso por otra aplicación\n\n📋 Pasos para arreglar:\n1. Cierra otras aplicaciones que usen el micrófono (Zoom, Teams, etc.)\n2. Cierra otras pestañas del navegador que puedan usar el micrófono\n3. Reinicia el navegador si es necesario\n4. Vuelve a intentar\n\n💡 Solo una aplicación puede usar el micrófono a la vez`
            : `⚠️ Microphone in use by another application\n\n📋 Steps to fix:\n1. Close other applications using the microphone (Zoom, Teams, etc.)\n2. Close other browser tabs that might be using the microphone\n3. Restart the browser if necessary\n4. Try again\n\n💡 Only one application can use the microphone at a time`;
        }
        // Error genérico con detalles
        else {
          userMessage = language === 'es'
            ? `❌ ${UI_TEXTS[language]?.errorMicGeneric ?? 'Microphone error'}\n\n📋 Pasos para solucionar:\n1. Verifica que tu micrófono esté conectado y funcionando\n2. Da permisos de micrófono a este sitio\n3. Ejecuta el diagnóstico con el botón abajo\n4. Revisa la consola del navegador para más detalles\n\nError técnico: ${err.message.substring(0, 80)}`
            : `❌ ${UI_TEXTS[language]?.errorMicGeneric ?? 'Microphone error'}\n\n📋 Steps to solve:\n1. Verify your microphone is connected and working\n2. Grant microphone permissions to this site\n3. Run the diagnostic with the button below\n4. Check browser console for more details\n\nTechnical error: ${err.message.substring(0, 80)}`;
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

  // FIX: Completed the truncated function and added state resets.
  const handleNewSession = useCallback(() => {
    cleanupAudio();
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(err => logger.error('Error closing session:', err));
      sessionPromiseRef.current = null;
    }
    setAppState('IDLE');
    setTranscript([]);
    setSummary('');
    setError(null);
    setPatientName('');
    // Limpiar handle de resumption para nueva sesión
    setSessionResumptionHandle(null);
    reconnectAttemptsRef.current = 0;
    // Resetear estado de módulos para nueva sesión
    setCurrentModule('MODULE_1');
    setCompletedModules([]);
    setModuleTranscripts(createEmptyModuleTranscripts());
    setNovaAskedTransition(false);
    setShouldAutoStart(false); // Resetear estado de auto-start
    setInterviewMode(null); // Resetear modo de entrevista para mostrar selector
  }, [cleanupAudio]);

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
    // NO limpiar transcript, patientName, sessionId, ni sessionResumptionHandle para mantener progreso
  }, [cleanupAudio]);

  // Función para reintentar la generación del resumen sin perder el transcript
  const handleRetryGenerateSummary = useCallback(async () => {
    // Verificar que hay transcript para procesar
    if (transcript.length === 0) {
      setError(language === 'es'
        ? 'No hay conversación para generar resumen.'
        : 'No conversation to generate summary.');
      return;
    }

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

    for (let attempt = 0; attempt < MAX_SUMMARY_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug(`🔄 Reintento ${attempt + 1}/${MAX_SUMMARY_RETRIES}...`);
        }

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('VITE_GEMINI_API_KEY no está configurada');
        }

        const ai = new GoogleGenAI({ apiKey: apiKey as string });

        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: SUMMARY_PROMPT[language](fullTranscriptText),
          }),
          SUMMARY_TIMEOUT
        );

        const sanitizedSummary = sanitizeHtml(response.text ?? '');

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

        if (attempt < MAX_SUMMARY_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt] ?? 5000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    if (!summaryGenerated && lastError) {
      const errorMessage = lastError.message;

      if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
        setError(language === 'es'
          ? 'La generación tardó demasiado. Por favor, intenta de nuevo.'
          : 'Generation took too long. Please try again.');
      } else if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('quota')) {
        setError(language === 'es'
          ? 'Demasiadas solicitudes. Espera 1 minuto e intenta de nuevo.'
          : 'Too many requests. Wait 1 minute and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError(language === 'es'
          ? 'Error de conexión. Verifica tu internet e intenta de nuevo.'
          : 'Connection error. Check your internet and try again.');
      } else {
        setError(language === 'es'
          ? `Error: ${errorMessage.substring(0, 100)}. Intenta de nuevo.`
          : `Error: ${errorMessage.substring(0, 100)}. Try again.`);
      }
      setSummaryGenerationFailed(true);
      setAppState('ERROR');
    }
  }, [transcript, language, user?.id, sessionId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to start session when idle and name is present
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && appState === 'IDLE' && patientName.trim()) {
        e.preventDefault();
        handleStartSession();
      }
      // Ctrl/Cmd + E to end session when listening
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && appState === 'LISTENING') {
        e.preventDefault();
        handleEndSession();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [appState, patientName, handleStartSession, handleEndSession]);


  // FIX: Added the missing return statement to render the component's UI.
  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans">
      <Header
        language={language}
        welcomeSoundEnabled={welcomeSoundEnabled}
        onToggleWelcomeSound={handleToggleWelcomeSound}
        isOnline={isOnline}
        userRole="patient"
      />

      {/* Modal de recuperación de sesión */}
      {showRecoveryModal && recoverableSessions.length > 0 && (
        <ErrorBoundary>
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
            <SessionRecoveryModal
              sessions={recoverableSessions}
              onRecover={handleRecoverSession}
              onDismiss={handleDismissRecovery}
              language={language}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Diagnóstico de micrófono */}
      {showMicrophoneDiagnostic && (
        <ErrorBoundary>
          <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
            <MicrophoneDiagnostic
              language={language}
              onClose={handleCloseMicrophoneDiagnostic}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      <main id="main-content" className="container mx-auto px-4 sm:px-6 pt-28 pb-12" role="main">
        {apiKeyError ? (
          <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{apiKeyError}</span>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Indicador de progreso - Solo visible durante sesión activa */}
            {appState === 'LISTENING' && (
              <ProgressIndicator
                messageCount={transcript.filter(m => m.sender === 'Nova').length}
                sessionStartTime={sessionStartTime}
                lastCheckpointTime={lastCheckpointTime}
                isSaving={isSavingCheckpoint}
                language={language}
              />
            )}

            {/* Selector de modo - solo se muestra cuando no hay modo seleccionado */}
            {!interviewMode && appState === 'IDLE' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-4 lg:gap-6">
                <div className="lg:row-span-2 animate-fade-in-scale">
                  <ErrorBoundary>
                    <ModeSelector
                      language={language}
                      onSelectMode={handleSelectMode}
                      patientName={patientName}
                      onPatientNameChange={setPatientName}
                      onLanguageChange={handleLanguageChange}
                    />
                  </ErrorBoundary>
                </div>
                <div className="lg:row-span-1 animate-fade-in-up animate-delay-100">
                  <ErrorBoundary>
                    <TranscriptionPanel
                      transcript={transcript}
                      appState={appState}
                      language={language}
                    />
                  </ErrorBoundary>
                </div>
                <div className="lg:row-span-1 animate-fade-in-up animate-delay-200">
                  <ErrorBoundary>
                    <SummaryPanel
                      summary={summary}
                      appState={appState}
                      language={language}
                      patientName={patientName}
                      onNewSession={handleNewSession}
                      transcript={transcript}
                      sessionId={sessionId}
                      sessionDuration={sessionStartTime > 0 ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            )}

            {/* Modo VOZ - ControlPanel con audio bidireccional */}
            {interviewMode === 'VOICE' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-4 lg:gap-6">
                <div className="lg:row-span-2 animate-fade-in-scale">
                  <ErrorBoundary>
                    <ControlPanel
                      appState={appState}
                      language={language}
                      onLanguageChange={handleLanguageChange}
                      onStartSession={handleStartSession}
                      onEndSession={handleEndSession}
                      audioFrequency={avgFrequency}
                      error={error}
                      patientName={patientName}
                      onPatientNameChange={setPatientName}
                      onOpenDiagnostic={handleOpenMicrophoneDiagnostic}
                      onRetry={handleRetryConnection}
                      onRetryGenerateSummary={handleRetryGenerateSummary}
                      summaryGenerationFailed={summaryGenerationFailed}
                      waitingForNova={waitingForNova}
                      // Module system props
                      currentModule={currentModule}
                      completedModules={completedModules}
                      onModuleTransition={handleModuleTransition}
                      isTransitioningModule={isTransitioningModule}
                    />
                  </ErrorBoundary>
                </div>
                <div className="lg:row-span-1 animate-fade-in-up animate-delay-100">
                  <ErrorBoundary>
                    <TranscriptionPanel
                      transcript={transcript}
                      appState={appState}
                      language={language}
                    />
                  </ErrorBoundary>
                </div>
                <div className="lg:row-span-1 animate-fade-in-up animate-delay-200">
                  <ErrorBoundary>
                    <SummaryPanel
                      summary={summary}
                      appState={appState}
                      language={language}
                      patientName={patientName}
                      onNewSession={handleNewSession}
                      transcript={transcript}
                      sessionId={sessionId}
                      sessionDuration={sessionStartTime > 0 ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            )}

            {/* Modo TEXTO - TextChatPanel con dictado */}
            {interviewMode === 'TEXT' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-4 lg:gap-6">
                <div className="lg:row-span-2 animate-fade-in-scale">
                  <ErrorBoundary>
                    <TextChatPanel
                      language={language}
                      transcript={transcript}
                      onSendMessage={handleSendTextMessage}
                      onEndSession={handleEndSession}
                      onStartSession={handleStartTextSession}
                      onBackToModeSelect={() => setInterviewMode(null)}
                      appState={appState}
                      isProcessing={waitingForNova}
                      error={error}
                      patientName={patientName}
                      onRetry={handleRetryConnection}
                      topicTracking={topicTracking}
                      topicsComplete={topicsComplete}
                      onRetryGenerateSummary={handleRetryGenerateSummary}
                      summaryGenerationFailed={summaryGenerationFailed}
                    />
                  </ErrorBoundary>
                </div>
                <div className="lg:row-span-1 animate-fade-in-up animate-delay-100">
                  <ErrorBoundary>
                    <TranscriptionPanel
                      transcript={transcript}
                      appState={appState}
                      language={language}
                    />
                  </ErrorBoundary>
                </div>
                <div className="lg:row-span-1 animate-fade-in-up animate-delay-200">
                  <ErrorBoundary>
                    <SummaryPanel
                      summary={summary}
                      appState={appState}
                      language={language}
                      patientName={patientName}
                      onNewSession={handleNewSession}
                      transcript={transcript}
                      sessionId={sessionId}
                      sessionDuration={sessionStartTime > 0 ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// FIX: Added default export for the App component.
export default App;
