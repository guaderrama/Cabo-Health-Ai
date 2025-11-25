
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { type AppState, type Language, type TranscriptMessage, type RecoverableSession } from './types';
import { SYSTEM_INSTRUCTIONS, UI_TEXTS, SUMMARY_PROMPT } from './constants';
import { encode, decode, decodeAudioData, concatenateUint8Arrays } from './utils/audioUtils';
import { sanitizeHtml } from './utils/sanitizeHtml';
import { uploadAudioFragmentWav } from './utils/audioStorage';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import DoctorDashboard from './components/DoctorDashboard';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import TranscriptionPanel from './components/TranscriptionPanel';
import SummaryPanel from './components/SummaryPanel';
import ProgressIndicator from './components/ProgressIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import { playWelcomeSound } from './services/audioService';

// Lazy loading de componentes no críticos para mejorar performance inicial
const SessionRecoveryModal = lazy(() => import('./components/SessionRecoveryModal'));
const MicrophoneDiagnostic = lazy(() => import('./components/MicrophoneDiagnostic'));
import {
  saveSessionCheckpoint,
  findRecoverableSessions,
  shouldSaveCheckpoint,
  clearCheckpoint,
  validateCheckpoint,
} from './services/sessionPersistence';

// FIX: A local 'LiveSession' type is defined here based on its usage to resolve the import error.
type LiveSession = {
  sendRealtimeInput(input: { media: { data: string; mimeType: string } }): void;
  close(): void;
};

const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

const App: React.FC = () => {
  const { user, userRole, loading } = useAuth();
  const [language, setLanguage] = useState<Language>('es');
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
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
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
        <Header language={language} isOnline={isOnline} />
        <DoctorDashboard language={language} />
      </>
    );
  }

  // Interfaz para pacientes (default)
  return <MainApp />;
};

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [language, setLanguage] = useState<Language>('es');
  const [patientName, setPatientName] = useState('');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [avgFrequency, setAvgFrequency] = useState(0);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
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

  // Estados para detector de silencio
  const [silenceWarningShown, setSilenceWarningShown] = useState(false);

  // Estado para detección de conexión
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [countdownValue, setCountdownValue] = useState(3);

  // Estado para detección de conexión
  const [connectionLostDuringSession, setConnectionLostDuringSession] = useState(false);

  // Estado para sonido de bienvenida (cargar de localStorage)
  const [welcomeSoundEnabled, setWelcomeSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('welcomeSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true; // Por defecto activado
  });

  // Guardar preferencia de sonido en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('welcomeSoundEnabled', JSON.stringify(welcomeSoundEnabled));
  }, [welcomeSoundEnabled]);

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

  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    // Vite solo expone variables con prefijo VITE_
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      setApiKeyError(UI_TEXTS[language].errorApiKey);
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
          console.error('Error guardando checkpoint:', result.error);
        }
      }
    };

    saveCheckpoint();
  }, [transcript.length, appState, user?.id, sessionId, patientName, language, sessionStartTime, lastSavedMessageCount]);

  // Detector de silencio prolongado
  useEffect(() => {
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
  }, [appState, avgFrequency, language, silenceWarningShown, transcript]);

  // Detector de pérdida de conexión
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 [DEBUG] Conexión restaurada');
      setIsOnline(true);

      if (connectionLostDuringSession && appState === 'ERROR') {
        setError(language === 'es'
          ? '✅ Conexión restaurada. Tu progreso está guardado. Puedes intentar continuar.'
          : '✅ Connection restored. Your progress is saved. You can try to continue.');
        setConnectionLostDuringSession(false);
      }
    };

    const handleOffline = () => {
      console.log('⚠️ [DEBUG] Conexión perdida');
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
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if ((appState === 'LISTENING' || appState === 'PROCESSING') && transcript.length > 0) {
        // Guardar checkpoint de emergencia
        if (user?.id && sessionId) {
          try {
            await saveSessionCheckpoint(
              user.id,
              sessionId,
              patientName,
              language,
              appState,
              transcript,
              currentInputTranscription.current,
              currentOutputTranscription.current,
              sessionStartTime
            );
            console.log('💾 [DEBUG] Checkpoint de emergencia guardado antes de salir');
          } catch (err) {
            console.error('❌ [DEBUG] Error guardando checkpoint de emergencia:', err);
          }
        }

        // Mostrar confirmación del navegador
        e.preventDefault();
        e.returnValue = ''; // Chrome requiere esto
        return ''; // Algunos navegadores requieren return value
      }
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

  const cleanupAudio = useCallback(() => {
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

  });

  // DESHABILITADO: Upload de audio de Nova a Supabase Storage
  // Causa errores RLS y consume storage innecesariamente
  if (currentOutputAudio.current.length > 0) {
    console.log('🔇 Audio de Nova capturado pero NO subido a storage (ahorro de costos)');
    currentOutputAudio.current = [];
  }

  // CÓDIGO ANTERIOR (comentado para referencia):
  // if (currentOutputAudio.current.length > 0) {
  //   const audioData = concatenateUint8Arrays(currentOutputAudio.current);
  //   audioUploadPromises.push(
  //     uploadAudioFragmentWav(audioData, sessionId, messageId, 'Nova', 24000)
  //       .then(url => {
  //         if (url) {
  //           setTranscript(t => t.map(m =>
  //             m.id === messageId ? { ...m, audioUrl: url } : m
  //           ));
  //         }
  //       })
  //   );
  //   currentOutputAudio.current = [];
  // }
}

return [...prev, ...newMessages];
                });

// Ejecutar subidas de audio sin esperar
Promise.all(audioUploadPromises).catch(err =>
  console.error('Error al subir fragmentos de audio:', err)
);
              }

// Limpiar refs inmediatamente después de agregar al transcript
currentInputTranscription.current = '';
currentOutputTranscription.current = '';
            }

// Fix: Usar optional chaining también en el acceso al índice del array
const audioDataB64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
if (audioDataB64 && outputAudioContextRef.current) {
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
  console.error('Live session connection error:', e);
  const errorMessage = e.message || String(e);

  // Detectar errores específicos y proporcionar pasos de solución
  let userErrorMessage = '';

  // Error de API key
  if (errorMessage.includes('API') || errorMessage.includes('api') || errorMessage.includes('key') || errorMessage.includes('401') || errorMessage.includes('403')) {
    userErrorMessage = language === 'es'
      ? `❌ Error de autenticación con Gemini API\n\n📋 Pasos para arreglar:\n1. Verifica que VITE_GEMINI_API_KEY esté en tu archivo .env\n2. Asegúrate de que la API key es válida en Google AI Studio\n3. Reinicia el servidor de desarrollo (pnpm dev)\n4. Recarga esta página\n\n💡 Guía: docs/API.md`
      : `❌ Gemini API authentication error\n\n📋 Steps to fix:\n1. Verify VITE_GEMINI_API_KEY is in your .env file\n2. Ensure the API key is valid in Google AI Studio\n3. Restart the development server (pnpm dev)\n4. Reload this page\n\n💡 Guide: docs/API.md`;
    setApiKeyError(UI_TEXTS[language].errorApiKey);
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
    console.log('Session closed by server:', e.code, e.reason);

    // Solo notificar si estamos en estado LISTENING (conexión inesperada cerrada)
    if (appStateRef.current === 'LISTENING') {
      const errorMsg = language === 'es'
        ? 'La conexión se cerró inesperadamente. Tu progreso está guardado. Puedes recargar la página para continuar.'
        : 'Connection closed unexpectedly. Your progress is saved. You can reload the page to continue.';

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
        ).catch(err => console.error('Error guardando checkpoint de emergencia:', err));
      }
    }
  },
        }
      });

    } catch (err) {
  console.error('Connection failed:', err);
  setError(UI_TEXTS[language].errorConnection);
  setAppState('ERROR');
}
  }, [language, welcomeSoundEnabled, cleanupAudio]);

const handleStartSession = useCallback(() => {
  setAppState('COUNTDOWN');
  setCountdownValue(3);

  let count = 3;
  const interval = setInterval(() => {
    count--;
    setCountdownValue(count);

    if (count <= 0) {
      clearInterval(interval);
      connectToGemini();
    }
  }, 1000);
}, [connectToGemini]);

// FIX: Completed the truncated function and added state resets.
const handleNewSession = useCallback(() => {
  cleanupAudio();
  if (sessionPromiseRef.current) {
    sessionPromiseRef.current.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
  }
  setAppState('IDLE');
  setTranscript([]);
  setSummary('');
  setError(null);
  setPatientName('');
}, [cleanupAudio]);

const handleRetryConnection = useCallback(() => {
  // Limpiar error y volver a estado IDLE manteniendo el progreso
  cleanupAudio();
  if (sessionPromiseRef.current) {
    sessionPromiseRef.current.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
  }
  setError(null);
  setAppState('IDLE');
  // NO limpiar transcript, patientName, ni sessionId para mantener progreso
}, [cleanupAudio]);

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
    />

    {/* Modal de recuperación de sesión */}
    {showRecoveryModal && recoverableSessions.length > 0 && (
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
        <SessionRecoveryModal
          sessions={recoverableSessions}
          onRecover={handleRecoverSession}
          onDismiss={handleDismissRecovery}
          language={language}
        />
      </Suspense>
    )}

    {/* Diagnóstico de micrófono */}
    {showMicrophoneDiagnostic && (
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
        <MicrophoneDiagnostic
          language={language}
          onClose={handleCloseMicrophoneDiagnostic}
        />
      </Suspense>
    )}

    <main className="container mx-auto px-4 sm:px-6 pt-28 pb-12">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 lg:grid-rows-2 gap-4 md:gap-6">
            <div className="md:col-span-1 lg:row-span-2 animate-fade-in-scale">
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
                  onRetry={connectToGemini}
                  countdownValue={countdownValue}
                />
              </ErrorBoundary>
            </div>
            <div className="md:col-span-1 lg:row-span-1 animate-fade-in-up animate-delay-100">
              <ErrorBoundary>
                <TranscriptionPanel
                  transcript={transcript}
                  appState={appState}
                  language={language}
                />
              </ErrorBoundary>
            </div>
            <div className="md:col-span-1 lg:row-span-1 animate-fade-in-up animate-delay-200">
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
        </div>
      )}
    </main>
  </div>
);
};

// FIX: Added default export for the App component.
export default App;
