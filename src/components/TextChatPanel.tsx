import React, { useState, useRef, useEffect } from 'react';
import { type AppState, type Language, type TranscriptMessage, type InterviewModule } from '../types';
import { UI_TEXTS, MODULE_CONFIGS } from '../constants';
import { SendIcon, MicrophoneIcon, StopIcon, SpeakerIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';

interface TextChatPanelProps {
  language: Language;
  transcript: TranscriptMessage[];
  onSendMessage: (text: string) => void;
  onEndSession: () => void;
  onStartSession: () => void;
  onBackToModeSelect: () => void;
  appState: AppState;
  currentModule: InterviewModule;
  completedModules: InterviewModule[];
  isProcessing: boolean;
  error: string | null;
  patientName: string;
  onRetry?: () => void;
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
  currentModule,
  completedModules,
  isProcessing,
  error,
  patientName,
  onRetry,
}) => {
  const texts = UI_TEXTS[language];
  const [inputText, setInputText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const speechSupported = getSpeechRecognitionSupport();
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const isIdle = appState === 'IDLE';
  const isListening = appState === 'LISTENING';
  const isConnecting = appState === 'CONNECTING';

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
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptText + ' ';
        } else {
          interim += transcriptText;
        }
      }

      if (final) {
        setInputText(prev => prev + final);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
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
        console.error('Error starting dictation:', e);
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
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">N</span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Nova</h2>
              <p className="text-xs text-slate-500">
                {isListening
                  ? (language === 'es' ? 'En conversacion' : 'In conversation')
                  : (language === 'es' ? 'Lista para chatear' : 'Ready to chat')}
              </p>
            </div>
          </div>

          {/* TTS Toggle */}
          {ttsSupported && isListening && (
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                ttsEnabled
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              title={texts.listenResponse}
            >
              <SpeakerIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Patient info */}
        {patientName && (
          <div className="mt-2 px-3 py-1.5 bg-blue-50 rounded-lg inline-flex items-center gap-2">
            <span className="text-xs text-blue-600 font-medium">
              {language === 'es' ? 'Paciente:' : 'Patient:'}
            </span>
            <span className="text-sm text-blue-800 font-semibold">{patientName}</span>
          </div>
        )}

        {/* Module Progress */}
        {isListening && (
          <div className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                {language === 'es' ? 'Modulo' : 'Module'} {currentModule.replace('MODULE_', '')} {language === 'es' ? 'de' : 'of'} 3
              </span>
              <span className="text-xs text-emerald-600">
                {MODULE_CONFIGS[currentModule][language === 'es' ? 'nameEs' : 'name']}
              </span>
            </div>
            <div className="flex gap-1">
              {(['MODULE_1', 'MODULE_2', 'MODULE_3'] as InterviewModule[]).map((mod) => (
                <div
                  key={mod}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    completedModules.includes(mod)
                      ? 'bg-emerald-500'
                      : mod === currentModule
                      ? 'bg-emerald-400'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {transcript.length === 0 && isIdle && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-600 mb-2">
              {language === 'es'
                ? 'Presiona "Iniciar Chat" para comenzar tu conversacion con Nova'
                : 'Press "Start Chat" to begin your conversation with Nova'}
            </p>
          </div>
        )}

        {transcript.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'Nova' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.sender === 'Nova'
                  ? 'bg-slate-100 text-slate-800 rounded-bl-md'
                  : 'bg-emerald-500 text-white rounded-br-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.timestamp && (
                <p className={`text-xs mt-1 ${msg.sender === 'Nova' ? 'text-slate-400' : 'text-emerald-200'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
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
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              {language === 'es' ? 'Reintentar' : 'Retry'}
            </button>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200">
        {isIdle ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={onStartSession}
              disabled={!patientName.trim()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors"
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
            <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mr-2" />
            <span className="text-slate-600">{texts.connecting}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={texts.chatPlaceholder}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:bg-slate-50"
                  rows={2}
                />

                {/* Dictation button inside textarea */}
                {speechSupported && (
                  <button
                    onClick={handleDictation}
                    disabled={isProcessing}
                    className={`absolute right-2 bottom-2 p-2 rounded-lg transition-colors ${
                      isDictating
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={isDictating ? texts.stopDictation : texts.dictateButton}
                  >
                    {isDictating ? <StopIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
                  </button>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isProcessing}
                className="p-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-xl transition-colors"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Dictating indicator */}
            {isDictating && (
              <div className="flex items-center gap-2 text-red-500 text-sm animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {texts.listeningDictation}
              </div>
            )}

            {/* End session button */}
            <button
              onClick={handleEndClick}
              className="w-full py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              {texts.endSession}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showEndConfirmation}
        title={language === 'es' ? 'Finalizar Chat?' : 'End Chat?'}
        message={language === 'es'
          ? 'Al finalizar, Nova generara el resumen clinico basado en la conversacion.'
          : 'When you end, Nova will generate a clinical summary based on the conversation.'}
        confirmText={texts.endSession || (language === 'es' ? 'Finalizar' : 'End')}
        cancelText={language === 'es' ? 'Continuar' : 'Continue'}
        onConfirm={handleConfirmEnd}
        onCancel={() => setShowEndConfirmation(false)}
        language={language}
        isDangerous={false}
      />
    </div>
  );
};

export default React.memo(TextChatPanel);
