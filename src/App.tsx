
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { type AppState, type Language, type TranscriptMessage, type RecoverableSession } from './types';
import { SYSTEM_INSTRUCTIONS, UI_TEXTS, SUMMARY_PROMPT } from './constants';
import { encode, decode, decodeAudioData, concatenateUint8Arrays } from './utils/audioUtils';
import { sanitizeHtml } from './utils/sanitizeHtml';
import { uploadAudioFragmentWav } from './utils/audioStorage';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import TranscriptionPanel from './components/TranscriptionPanel';
import SummaryPanel from './components/SummaryPanel';
import SessionRecoveryModal from './components/SessionRecoveryModal';
import ProgressIndicator from './components/ProgressIndicator';
import MicrophoneDiagnostic from './components/MicrophoneDiagnostic';
import ApiDiagnostic from './components/ApiDiagnostic';
import { playWelcomeSound } from './services/audioService';
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
  const { user, loading } = useAuth();
  
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
  
  // Usuario autenticado, mostrar aplicación
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
  const [showApiDiagnostic, setShowApiDiagnostic] = useState(false);
  
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
        appState === 'LISTENING' &&
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
          appState,
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
    
    // Desconectar nodos de audio
    audioWorkletNodeRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    
    // Limpiar referencias
    analyserRef.current = null;
    audioWorkletNodeRef.current = null;
    mediaStreamSourceRef.current = null;
    
    // Detener tracks de media stream
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    // Cerrar contextos de audio
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    outputAudioContextRef.current?.close().catch(() => {});
    outputAudioContextRef.current = null;
    
    // Resetear frecuencia
    setAvgFrequency(0);
  }, []);

  // Manejar recuperación de sesión
  const handleRecoverSession = useCallback((session: RecoverableSession) => {
    const checkpoint = session.checkpoint;

    // Validar checkpoint antes de recuperar
    if (!validateCheckpoint(checkpoint)) {
      console.error('Checkpoint inválido, no se puede recuperar');
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
    // Use appStateRef to get the latest state and prevent re-entry from the onclose callback.
    if (appStateRef.current !== 'LISTENING') return;
    
    // Synchronously update the ref to act as a lock.
    appStateRef.current = 'PROCESSING';
    setAppState('PROCESSING');

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing live session:", e);
      } finally {
        sessionPromiseRef.current = null;
      }
    }
    cleanupAudio();

    const finalTranscript = [...transcript];
    if (currentInputTranscription.current.trim()) {
      finalTranscript.push({
        id: generateUniqueId(),
        sender: 'You',
        text: currentInputTranscription.current.trim(),
        lang: language,
      });
    }
    if (currentOutputTranscription.current.trim()) {
      finalTranscript.push({
        id: generateUniqueId(),
        sender: 'Nova',
        text: currentOutputTranscription.current.trim(),
        lang: language,
      });
    }

    setTranscript(finalTranscript);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
    
    const fullTranscriptText = finalTranscript.map(t => `${t.sender === 'Nova' ? 'Nova' : (language === 'es' ? 'Tú' : 'You')}: ${t.text}`).join('\n');

    if (fullTranscriptText.trim().length < 50) {
      setSummary(UI_TEXTS[language].summaryError);
      setAppState('COMPLETED');
      return;
    }

    try {
        // Vite solo expone variables con prefijo VITE_
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('VITE_GEMINI_API_KEY no está configurada en las variables de entorno');
        }
        const ai = new GoogleGenAI({ apiKey: apiKey as string });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: SUMMARY_PROMPT[language](fullTranscriptText),
        });
        const sanitizedSummary = sanitizeHtml(response.text);
        setSummary(sanitizedSummary);
        setAppState('COMPLETED');
        
        // Limpiar checkpoint al completar sesión exitosamente
        if (user?.id && sessionId) {
          await clearCheckpoint(sessionId, user.id);
        }
    } catch (err) {
        console.error('Summary generation failed:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Mensaje más específico si es error de API key
        if (errorMessage.includes('VITE_GEMINI_API_KEY') || errorMessage.includes('API') || errorMessage.includes('401') || errorMessage.includes('403')) {
          setError(`Error de configuración: ${errorMessage}. Por favor, verifica tu archivo .env`);
          setApiKeyError(UI_TEXTS[language].errorApiKey);
        } else {
          setError(UI_TEXTS[language].errorSummary);
        }
        setAppState('ERROR');
    }
  }, [transcript, language, cleanupAudio, user?.id, sessionId]);

  const handleStartSession = useCallback(async () => {
    setAppState('CONNECTING');
    setError(null);
    setTranscript([]);
    setSummary('');
    
    // Generar ID de sesión y registrar inicio
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setSessionStartTime(Date.now());
    
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
      
      playWelcomeSound(outputAudioContextRef.current);

      nextAudioStartTime.current = 0;
      outputSourcesRef.current.clear();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
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
        
        // Guardar audio para almacenamiento posterior
        currentInputAudio.current.push(pcmData);
        
        const pcmBlob = {
            data: encode(pcmData),
            mimeType: 'audio/pcm;rate=16000',
        };
        sessionPromiseRef.current?.then((session) => {
          try {
            session.sendRealtimeInput({ media: pcmBlob });
          } catch(e) {
            console.error("Failed to send audio data:", e);
          }
        });
      };
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (appStateRef.current !== 'LISTENING') return;
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        setAvgFrequency(sum / dataArray.length);
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
      
      // Vite solo expone variables con prefijo VITE_
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('VITE_GEMINI_API_KEY no está configurada en las variables de entorno');
      }
      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: SYSTEM_INSTRUCTIONS[language],
        },
        callbacks: {
          onopen: () => {
            setAppState('LISTENING');
            source.connect(analyser);
            analyser.connect(workletNode);
            workletNode.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              // Usar un flag local para evitar duplicados
              const inputText = currentInputTranscription.current.trim();
              const outputText = currentOutputTranscription.current.trim();
              
              if (inputText || outputText) {
                // Subir audio en paralelo (sin bloquear la UI)
                const audioUploadPromises: Promise<void>[] = [];
                
                setTranscript(prev => {
                  const newMessages: TranscriptMessage[] = [];
                  
                  if (inputText) {
                    const messageId = generateUniqueId();
                    newMessages.push({ 
                      id: messageId, 
                      sender: 'You', 
                      text: inputText, 
                      lang: language,
                      timestamp: new Date().toISOString()
                    });
                    
                    // Subir audio de entrada si existe
                    if (currentInputAudio.current.length > 0) {
                      const audioData = concatenateUint8Arrays(currentInputAudio.current);
                      audioUploadPromises.push(
                        uploadAudioFragmentWav(audioData, sessionId, messageId, 'You', 16000)
                          .then(url => {
                            if (url) {
                              // Actualizar el mensaje con la URL del audio
                              setTranscript(t => t.map(m => 
                                m.id === messageId ? { ...m, audioUrl: url } : m
                              ));
                            }
                          })
                      );
                      currentInputAudio.current = [];
                    }
                  }
                  
                  if (outputText) {
                    const messageId = generateUniqueId();
                    newMessages.push({ 
                      id: messageId, 
                      sender: 'Nova', 
                      text: outputText, 
                      lang: language,
                      timestamp: new Date().toISOString()
                    });
                    
                    // Subir audio de salida si existe
                    if (currentOutputAudio.current.length > 0) {
                      const audioData = concatenateUint8Arrays(currentOutputAudio.current);
                      audioUploadPromises.push(
                        uploadAudioFragmentWav(audioData, sessionId, messageId, 'Nova', 24000)
                          .then(url => {
                            if (url) {
                              setTranscript(t => t.map(m => 
                                m.id === messageId ? { ...m, audioUrl: url } : m
                              ));
                            }
                          })
                      );
                      currentOutputAudio.current = [];
                    }
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
            
            const audioDataB64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
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
            
            // Detectar errores relacionados con API key
            if (errorMessage.includes('API') || errorMessage.includes('api') || errorMessage.includes('key') || errorMessage.includes('401') || errorMessage.includes('403')) {
              setError(`Error de autenticación con Gemini API. Por favor, verifica que VITE_GEMINI_API_KEY esté configurada correctamente en tu archivo .env`);
              setApiKeyError(UI_TEXTS[language].errorApiKey);
            } else {
              setError(UI_TEXTS[language].errorConnection);
            }
            setAppState('ERROR');
            cleanupAudio();
          },
          onclose: (e: CloseEvent) => {
            console.log('Session closed by server.');
            // This was causing a recursive call to handleEndSession.
            // The user-initiated end session flow is sufficient.
          },
        }
      });

    } catch (err) {
      console.error('Failed to start session:', err);
      let userMessage = UI_TEXTS[language].errorMicGeneric;
      if (err instanceof Error) {
        if (err.message === 'SECURE_CONTEXT_REQUIRED') {
            userMessage = UI_TEXTS[language].errorHttpsRequired;
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userMessage = UI_TEXTS[language].errorMicPermission;
        } else if (err.name === 'NotFoundError') {
          userMessage = UI_TEXTS[language].errorMicNotFound;
        }
      }
      setError(userMessage);
      setAppState('ERROR');
      cleanupAudio();
    }
  }, [language, cleanupAudio, handleEndSession]);
  
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
      <Header language={language} />
      
      {/* Modal de recuperación de sesión */}
      {showRecoveryModal && recoverableSessions.length > 0 && (
        <SessionRecoveryModal
          sessions={recoverableSessions}
          onRecover={handleRecoverSession}
          onDismiss={handleDismissRecovery}
          language={language}
        />
      )}
      
      {/* Diagnóstico de micrófono */}
      {showMicrophoneDiagnostic && (
        <MicrophoneDiagnostic
          language={language}
          onClose={handleCloseMicrophoneDiagnostic}
        />
      )}

      {/* Diagnóstico de API */}
      {showApiDiagnostic && (
        <ApiDiagnostic
          language={language}
          onClose={() => setShowApiDiagnostic(false)}
        />
      )}
      
      <main className="container mx-auto px-4 sm:px-6 pt-28 pb-12">
        {apiKeyError ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg" role="alert">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Error de Configuración</h3>
                  <p className="mb-4">{apiKeyError}</p>
                  <button
                    onClick={() => setShowApiDiagnostic(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    🔍 Ejecutar Diagnóstico
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Indicador de progreso - Solo visible durante sesión activa */}
            {appState === 'LISTENING' && (
              <ProgressIndicator
                messageCount={transcript.length}
                sessionStartTime={sessionStartTime}
                lastCheckpointTime={lastCheckpointTime}
                isSaving={isSavingCheckpoint}
                language={language}
              />
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-6">
              <div className="lg:row-span-2">
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
                />
              </div>
              <div className="lg:row-span-1">
                <TranscriptionPanel
                  transcript={transcript}
                  appState={appState}
                  language={language}
                />
              </div>
              <div className="lg:row-span-1">
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
