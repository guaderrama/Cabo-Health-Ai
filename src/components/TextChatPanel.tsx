import React, { useState, useRef, useEffect } from 'react';
import { type AppState, type Language, type TranscriptMessage, type TopicTracking, TOPIC_NAMES } from '../types';
import { UI_TEXTS } from '../constants';
import { logger } from '../lib/logger';
import { SendIcon, MicrophoneIcon, StopIcon, SpeakerIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';
import TypingMessage from './TypingMessage';
import { MIN_TOPICS_REQUIRED, ESSENTIAL_TOPICS } from '../hooks/useTopicTracking';

interface TextChatPanelProps {
  language: Language;
  transcript: TranscriptMessage[];
  onSendMessage: (text: string) => void;
  onEndSession: () => void;
  onStartSession: () => void;
  onBackToModeSelect: () => void;
  appState: AppState;
  isProcessing: boolean;
  error: string | null;
  patientName: string;
  onRetry?: () => void;
  // Topic tracking props
  topicTracking?: TopicTracking;
  topicsComplete?: boolean;
  // Summary regeneration props
  onRetryGenerateSummary?: () => void;
  summaryGenerationFailed?: boolean;
}

// Detectar soporte de Web Speech API
const getSpeechRecognitionSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) return false;
  // Firefox y Edge tienen problemas conocidos
  if (navigator.userAgent.includes('Firefox') || navigator.userAgent.includes('Edg')) return false;
  return true;
};

const TextChatPanel: React.FC<TextChatPanelProps> = ({
  language,
  transcript,
  onSendMessage,
  onEndSession,
  onStartSession,
  onBackToModeSelect,
  appState,
  isProcessing,
  error,
  patientName,
  onRetry,
  topicTracking,
  topicsComplete,
  // Summary regeneration props
  onRetryGenerateSummary,
  summaryGenerationFailed = false,
}) => {
  const texts = UI_TEXTS[language];
  const [inputText, setInputText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionStartRef = useRef<number | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  const speechSupported = getSpeechRecognitionSupport();
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const isIdle = appState === 'IDLE';
  const isListening = appState === 'LISTENING';
  const isConnecting = appState === 'CONNECTING';

  // Duración mínima requerida: 20 minutos (en ms)
  const MIN_SESSION_DURATION = 20 * 60 * 1000;

  // Iniciar tracking de duración cuando empieza la sesión
  useEffect(() => {
    if (isListening && !sessionStartRef.current) {
      sessionStartRef.current = Date.now();
    }
    if (isIdle) {
      sessionStartRef.current = null;
      setSessionDuration(0);
    }
  }, [isListening, isIdle]);

  // Actualizar duración cada 5 segundos (más responsivo para el botón Finalizar)
  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => {
      if (sessionStartRef.current) {
        setSessionDuration(Date.now() - sessionStartRef.current);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isListening]);

  // Detectar si Nova ha indicado que terminó la entrevista
  // Usamos frases específicas de cierre para evitar falsos positivos
  const interviewCompletePatterns = {
    es: [
      'hemos terminado la entrevista',
      'hemos completado la entrevista',
      'gracias por compartir todo esto conmigo',
      'he recopilado toda la información',
      'ya tengo toda la información que necesito',
      'la entrevista ha concluido',
    ],
    en: [
      'we have completed the interview',
      'the interview is now complete',
      'thank you for sharing all of this with me',
      'i have gathered all the information',
      'i now have all the information i need',
      'the interview has concluded',
    ],
  };

  const interviewComplete = transcript.some(msg => {
    if (msg.sender !== 'Nova') return false;
    const text = msg.text.toLowerCase();
    const patterns = [...interviewCompletePatterns.es, ...interviewCompletePatterns.en];
    return patterns.some(pattern => text.includes(pattern));
  });

  // Auto-scroll al nuevo mensaje
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  // Text-to-Speech para respuestas de Nova
  useEffect(() => {
    if (ttsEnabled && ttsSupported && transcript.length > 0) {
      const lastMessage = transcript[transcript.length - 1];
      if (lastMessage && lastMessage.sender === 'Nova') {
        const utterance = new SpeechSynthesisUtterance(lastMessage.text);
        utterance.lang = language === 'es' ? 'es-ES' : 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.cancel(); // Cancelar cualquier speech anterior
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [transcript, ttsEnabled, ttsSupported, language]);

  // Inicializar Web Speech API para dictado
  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language === 'es' ? 'es-ES' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptText + ' ';
        }
        // Los resultados intermedios (interim) se ignoran - solo usamos los finales
      }

      if (final) {
        setInputText(prev => prev + final);
      }
    };

    recognition.onerror = (event: any) => {
      logger.error('Speech recognition error:', event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignorar errores al abortar
        }
      }
    };
  }, [language, speechSupported]);

  const handleDictation = () => {
    if (!recognitionRef.current) return;

    if (isDictating) {
      recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsDictating(true);
      } catch (e) {
        logger.error('Error starting dictation:', e);
      }
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndClick = () => {
    setShowEndConfirmation(true);
  };

  const handleConfirmEnd = () => {
    setShowEndConfirmation(false);
    onEndSession();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-full min-h-[500px] md:min-h-[600px] lg:min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-700 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">N</span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Nova</h2>
              <p className="text-xs text-slate-500">
                {isListening
                  ? (language === 'es' ? 'En conversación' : 'In conversation')
                  : (language === 'es' ? 'Lista para chatear' : 'Ready to chat')}
              </p>
            </div>
          </div>

          {/* TTS Toggle */}
          {ttsSupported && isListening && (
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-lg transition-colors ${ttsEnabled
                ? 'bg-teal-100 text-teal-600'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              title={texts.listenResponse}
            >
              <SpeakerIcon className="w-5 h-5" />
            </button>
          )}

          {/* Topic Progress Indicator */}
          {isListening && topicTracking && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: MIN_TOPICS_REQUIRED }, (_, i) => {
                  const topicNum = i + 1;
                  const isCovered = topicTracking.coveredTopics.has(topicNum);
                  const isEssential = ESSENTIAL_TOPICS.includes(topicNum);
                  return (
                    <div
                      key={topicNum}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isCovered
                          ? 'bg-emerald-500'
                          : isEssential
                            ? 'bg-amber-300'
                            : 'bg-slate-200'
                      }`}
                      title={TOPIC_NAMES[language][topicNum] || `Tema ${topicNum}`}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {topicTracking.coveredTopics.size}/{MIN_TOPICS_REQUIRED}
              </span>
            </div>
          )}
        </div>

        {/* Patient info */}
        {patientName && (
          <div className="mt-2 px-3 py-1.5 bg-teal-50 rounded-lg inline-flex items-center gap-2">
            <span className="text-xs text-teal-600 font-medium">
              {language === 'es' ? 'Paciente:' : 'Patient:'}
            </span>
            <span className="text-sm text-teal-800 font-semibold">{patientName}</span>
          </div>
        )}

        {/* Module Progress removed - TEXT mode uses single continuous session */}
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {transcript.length === 0 && isIdle && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-600 mb-2">
              {language === 'es'
                ? 'Presiona "Iniciar Chat" para comenzar tu conversación con Nova'
                : 'Press "Start Chat" to begin your conversation with Nova'}
            </p>
          </div>
        )}

        {transcript.map((msg, index) => (
          <TypingMessage
            key={msg.id}
            text={msg.text}
            sender={msg.sender as 'Nova' | 'You'}
            timestamp={msg.timestamp}
            language={language}
            isLatest={index === transcript.length - 1}
            speed={50}
          />
        ))}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {onRetry && !summaryGenerationFailed && (
              <button
                onClick={onRetry}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                {language === 'es' ? 'Reintentar' : 'Retry'}
              </button>
            )}
            {summaryGenerationFailed && onRetryGenerateSummary && (
              <button
                onClick={onRetryGenerateSummary}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors active:scale-95 shadow-md"
                title={language === 'es'
                  ? 'Volver a intentar generar el resumen clínico con la conversación existente'
                  : 'Retry generating the clinical summary with the existing conversation'}
              >
                {language === 'es' ? '🔄 Regenerar Resumen' : '🔄 Regenerate Summary'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200">
        {isIdle ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={onStartSession}
              disabled={!patientName.trim()}
              className="w-full py-3 text-white font-semibold rounded-xl transition-colors disabled:bg-slate-300"
              style={{ background: patientName.trim() ? 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)' : undefined }}
            >
              {language === 'es' ? 'Iniciar Chat' : 'Start Chat'}
            </button>
            <button
              onClick={onBackToModeSelect}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              {language === 'es' ? 'Volver a seleccionar modo' : 'Back to mode selection'}
            </button>
          </div>
        ) : isConnecting ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin mr-2" />
            <span className="text-slate-600">{texts.connecting}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Input area with better layout */}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={texts.chatPlaceholder}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 pr-14 border-2 border-slate-200 rounded-2xl resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition disabled:bg-slate-50 text-lg shadow-sm"
                  style={{ fontSize: '1.125rem', lineHeight: '1.6' }}
                  rows={3}
                />

                {/* Dictation button - ocean blue theme */}
                {speechSupported && (
                  <button
                    onClick={handleDictation}
                    disabled={isProcessing}
                    className={`absolute right-2 bottom-2 p-2.5 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${isDictating
                        ? 'bg-red-500 text-white shadow-lg scale-110'
                        : 'bg-teal-50 text-teal-600 hover:bg-teal-100 hover:text-teal-700 border border-teal-200'
                      }`}
                    title={isDictating ? texts.stopDictation : texts.dictateButton}
                    aria-label={isDictating ? texts.stopDictation : texts.dictateButton}
                  >
                    {isDictating ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                  </button>
                )}
              </div>

              {/* Send button - Ocean blue to match header */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isProcessing}
                className="p-3.5 text-white rounded-xl transition-all min-w-[52px] min-h-[52px] flex items-center justify-center shadow-md hover:shadow-lg disabled:shadow-none"
                style={{
                  background: !inputText.trim() || isProcessing
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)'
                }}
                aria-label={language === 'es' ? 'Enviar mensaje' : 'Send message'}
              >
                <SendIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Dictating indicator */}
            {isDictating && (
              <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {texts.listeningDictation}
              </div>
            )}

            {/* End session button - visible when topics complete OR Nova signals completion, AND minimum duration met */}
            {(topicsComplete || interviewComplete) && sessionDuration >= MIN_SESSION_DURATION && (
              <button
                onClick={handleEndClick}
                className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-colors shadow-md"
                style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)' }}
              >
                {language === 'es' ? '✓ Finalizar y Enviar al Doctor' : '✓ Finish and Send to Doctor'}
              </button>
            )}

            {/* Message when topics/interview complete but duration not met */}
            {(topicsComplete || interviewComplete) && sessionDuration < MIN_SESSION_DURATION && (
              <p className="text-xs text-amber-600 text-center">
                {language === 'es'
                  ? 'La sesión requiere al menos 20 minutos para garantizar una evaluación completa.'
                  : 'The session requires at least 20 minutes to ensure a complete evaluation.'}
              </p>
            )}

            {/* Progress message when not enough topics covered */}
            {!topicsComplete && !interviewComplete && topicTracking && topicTracking.coveredTopics.size > 0 && (
              <p className="text-xs text-slate-500 text-center">
                {language === 'es'
                  ? `Progreso: ${topicTracking.coveredTopics.size}/${MIN_TOPICS_REQUIRED} temas cubiertos`
                  : `Progress: ${topicTracking.coveredTopics.size}/${MIN_TOPICS_REQUIRED} topics covered`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showEndConfirmation}
        title={language === 'es' ? 'Finalizar Chat?' : 'End Chat?'}
        message={language === 'es'
          ? 'Al finalizar, Nova generará el resumen clínico basado en la conversación.'
          : 'When you end, Nova will generate a clinical summary based on the conversation.'}
        confirmText={texts.endSession || (language === 'es' ? 'Finalizar' : 'End')}
        cancelText={language === 'es' ? 'Continuar' : 'Continue'}
        onConfirm={handleConfirmEnd}
        onCancel={() => setShowEndConfirmation(false)}
        language={language}
        isDangerous={false}
      />
    </div >
  );
};

export default React.memo(TextChatPanel);
