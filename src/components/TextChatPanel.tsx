import React, { useState, useRef, useEffect, useCallback } from 'react';
import { type AppState, type Language, type TranscriptMessage, type TopicTracking, TOPIC_NAMES } from '../types';
import { logger } from '../lib/logger';
import { SendIcon, MicrophoneIcon, StopIcon, SpeakerIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';
import TypingMessage from './TypingMessage';
import { MIN_TOPICS_REQUIRED } from '../hooks/useTopicTracking';
import { stripMarkdown } from '../utils/richText';

interface TextChatPanelProps {
  language: Language;
  transcript: TranscriptMessage[];
  onSendMessage: (text: string) => void;
  onRetryMessage: (messageId: string) => void;
  onEndSession: () => void;
  /** Salir sin enviar (la conversación es demasiado corta para el médico). */
  onDiscardSession: () => void;
  onStartSession: () => void;
  onBackToWelcome: () => void;
  appState: AppState;
  isProcessing: boolean;
  error: string | null;
  onDismissError: () => void;
  patientName: string;
  sessionStartTime: number;
  topicTracking?: TopicTracking;
  topicsComplete?: boolean;
}

type EndVariant = 'too_short' | 'incomplete' | 'ready';

// Firefox y Edge tienen problemas conocidos con la Web Speech API
const getSpeechRecognitionSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) return false;
  if (navigator.userAgent.includes('Firefox') || navigator.userAgent.includes('Edg')) return false;
  return true;
};

// Frases con las que Nova cierra la entrevista (evitan falsos positivos)
const INTERVIEW_COMPLETE_PATTERNS = [
  'hemos terminado la entrevista',
  'hemos completado la entrevista',
  'gracias por compartir todo esto conmigo',
  'he recopilado toda la información',
  'ya tengo toda la información que necesito',
  'la entrevista ha concluido',
  'we have completed the interview',
  'the interview is now complete',
  'thank you for sharing all of this with me',
  'i have gathered all the information',
  'i now have all the information i need',
  'the interview has concluded',
];

const TextChatPanel: React.FC<TextChatPanelProps> = ({
  language,
  transcript,
  onSendMessage,
  onRetryMessage,
  onEndSession,
  onDiscardSession,
  onStartSession,
  onBackToWelcome,
  appState,
  isProcessing,
  error,
  onDismissError,
  patientName,
  sessionStartTime,
  topicTracking,
  topicsComplete = false,
}) => {
  const es = language === 'es';
  const [inputText, setInputText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [endVariant, setEndVariant] = useState<EndVariant | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const speechSupported = getSpeechRecognitionSupport();
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  const isListening = appState === 'LISTENING';
  const isConnecting = appState === 'CONNECTING';
  const startFailed = appState === 'ERROR' && transcript.length === 0;

  const coveredCount = topicTracking?.coveredTopics.size ?? 0;
  const currentTopicName = topicTracking?.currentTopic ? TOPIC_NAMES[language][topicTracking.currentTopic] : null;
  const patientMessages = transcript.filter(m => m.sender === 'You' && !m.failed).length;
  const lastMessage = transcript[transcript.length - 1];
  const lastIsNova = lastMessage?.sender === 'Nova';
  const closingSaid = transcript.some(msg =>
    msg.sender === 'Nova' && INTERVIEW_COMPLETE_PATTERNS.some(p => msg.text.toLowerCase().includes(p))
  );
  // Nova dejó de preguntar en su último mensaje ("p": null en la marca de temas)
  const novaStopped = lastIsNova && !!topicTracking?.novaStopped;
  // Terminó de verdad: dijo su frase de cierre, o ya cubrió los temas y dejó de preguntar.
  // Cubrir 15 temas no basta: Nova puede seguir preguntando y el aviso la contradiría.
  const novaFinished = closingSaid || (topicsComplete && novaStopped);
  const minutes = Math.floor(elapsedMs / 60000);

  // Nova cubre de 15 a 20 temas y además hace preguntas de cambio, así que al llegar al
  // último de los 15 se muestra "Últimas preguntas" (no "15 de 15" repetido) y la barra
  // solo se llena cuando Nova de verdad terminó.
  const progress = novaFinished ? 1 : Math.min(coveredCount / MIN_TOPICS_REQUIRED, 0.95);
  const progressLabel = novaFinished
    ? (es ? 'Preguntas terminadas' : 'Questions finished')
    : coveredCount >= MIN_TOPICS_REQUIRED - 1
      ? (es ? 'Últimas preguntas' : 'Last questions')
      : (es ? `Tema ${coveredCount + 1} de ${MIN_TOPICS_REQUIRED}` : `Topic ${coveredCount + 1} of ${MIN_TOPICS_REQUIRED}`);

  // Reloj de la entrevista (usa el inicio real de la sesión, también al recuperarla)
  useEffect(() => {
    if (!isListening || !sessionStartTime) return undefined;
    const tick = () => setElapsedMs(Date.now() - sessionStartTime);
    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, [isListening, sessionStartTime]);

  const isNearBottom = () => {
    const el = chatContainerRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = useCallback((smooth = true) => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Al llegar un mensaje nuevo, bajar al final
  useEffect(() => {
    scrollToBottom();
  }, [transcript.length, isProcessing, scrollToBottom]);

  // Mientras Nova "escribe", seguir bajando solo si la persona no subió a leer
  useEffect(() => {
    const last = transcript[transcript.length - 1];
    if (!last || last.sender !== 'Nova') return undefined;
    const interval = setInterval(() => {
      if (isNearBottom()) scrollToBottom(false);
    }, 400);
    const stop = setTimeout(() => clearInterval(interval), Math.min(last.text.split(/\s+/).length * 30 + 1000, 20000));
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [transcript, scrollToBottom]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return undefined;
    const handleScroll = () => setShowScrollButton(!isNearBottom());
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Leer en voz alta las respuestas de Nova
  useEffect(() => {
    if (!ttsEnabled || !ttsSupported) return;
    const lastMessage = transcript[transcript.length - 1];
    if (lastMessage?.sender === 'Nova') {
      const utterance = new SpeechSynthesisUtterance(stripMarkdown(lastMessage.text));
      utterance.lang = es ? 'es-MX' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [transcript, ttsEnabled, ttsSupported, es]);

  useEffect(() => {
    if (!ttsEnabled && ttsSupported) window.speechSynthesis.cancel();
  }, [ttsEnabled, ttsSupported]);

  // Dictado con Web Speech API
  useEffect(() => {
    if (!speechSupported) return undefined;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = es ? 'es-MX' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text + ' ';
        else interim += text;
      }
      if (final) {
        setInputText(prev => prev + final);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };
    recognition.onerror = (event: any) => {
      logger.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setDictationError(es
          ? 'Tu navegador no dio permiso al micrófono. Puedes escribir tu respuesta.'
          : 'Your browser did not allow the microphone. You can type your answer.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setDictationError(es ? 'El dictado se detuvo. Intenta de nuevo.' : 'Dictation stopped. Try again.');
      }
      setIsDictating(false);
    };
    recognition.onend = () => {
      setIsDictating(false);
      setInterimText('');
    };
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignorar
      }
    };
  }, [es, speechSupported]);

  const handleDictation = () => {
    if (!recognitionRef.current) return;
    setDictationError(null);
    if (isDictating) {
      recognitionRef.current.stop();
      setIsDictating(false);
      setInterimText('');
      return;
    }
    try {
      recognitionRef.current.start();
      setIsDictating(true);
    } catch (e) {
      logger.error('Error starting dictation:', e);
    }
  };

  const resizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isProcessing || !isListening) return;
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    }
    onSendMessage(text);
    setInputText('');
    setInterimText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // En computadora Enter envía; en el teléfono Enter hace salto de línea y se usa el botón
    if (e.key === 'Enter' && !e.shiftKey && !isTouch) {
      e.preventDefault();
      handleSend();
    }
  };

  const openEndDialog = () => {
    if (patientMessages < 2) setEndVariant('too_short');
    else if (!novaFinished) setEndVariant('incomplete');
    else setEndVariant('ready');
  };

  const confirmEnd = () => {
    const variant = endVariant;
    setEndVariant(null);
    if (variant === 'too_short') onDiscardSession();
    else onEndSession();
  };

  const endDialog: Record<EndVariant, { title: string; message: string; confirm: string; danger: boolean }> = {
    too_short: {
      title: es ? '¿Salir sin enviar?' : 'Leave without sending?',
      message: es
        ? 'Todavía no hay suficiente información para tu médico. Si sales ahora, esta conversación no se enviará.'
        : 'There is not enough information for your doctor yet. If you leave now, this conversation will not be sent.',
      confirm: es ? 'Salir sin enviar' : 'Leave without sending',
      danger: true,
    },
    incomplete: {
      title: es ? '¿Terminar antes?' : 'Finish early?',
      message: es
        ? `Todavía faltan algunas preguntas (${coveredCount} de ${MIN_TOPICS_REQUIRED} temas). Si terminas ahora, tu médico recibirá una entrevista incompleta.`
        : `There are still some questions left (${coveredCount} of ${MIN_TOPICS_REQUIRED} topics). If you finish now, your doctor will receive an incomplete interview.`,
      confirm: es ? 'Terminar de todos modos' : 'Finish anyway',
      danger: false,
    },
    ready: {
      title: es ? '¿Enviar a Cabo Health?' : 'Send to Cabo Health?',
      message: es
        ? 'Tu médico recibirá esta conversación y un resumen preparado por Nova.'
        : 'Your doctor will receive this conversation and a summary prepared by Nova.',
      confirm: es ? 'Enviar a Cabo Health' : 'Send to Cabo Health',
      danger: false,
    },
  };

  const statusText = isConnecting
    ? (es ? 'Conectando…' : 'Connecting…')
    : isProcessing
      ? (es ? 'Escribiendo…' : 'Typing…')
      : (es ? 'En línea' : 'Online');

  return (
    <section className="flex h-full min-h-0 flex-col bg-white sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm" aria-label={es ? 'Conversación con Nova' : 'Conversation with Nova'}>
      {/* Encabezado compacto */}
      <div className="border-b border-slate-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary" aria-hidden="true">
            <span className="font-bold text-white">N</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold leading-tight text-slate-900">Nova</h1>
            <p className="text-sm text-slate-600">{statusText}</p>
          </div>

          {ttsSupported && isListening && (
            <button
              onClick={() => setTtsEnabled(v => !v)}
              aria-pressed={ttsEnabled}
              aria-label={es ? 'Leer respuestas en voz alta' : 'Read answers aloud'}
              title={es ? 'Leer respuestas en voz alta' : 'Read answers aloud'}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                ttsEnabled ? 'bg-primary-soft text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <SpeakerIcon className="h-5 w-5" />
            </button>
          )}

          {isConnecting && (
            <button
              onClick={onBackToWelcome}
              className="min-h-[44px] rounded-xl px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
          )}

          {isListening && (
            <button
              onClick={openEndDialog}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {es ? 'Terminar' : 'Finish'}
            </button>
          )}
        </div>

        {isListening && (
          <div className="mt-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <p className="min-w-0 truncate text-slate-700">
                <span className="font-semibold text-slate-900">{progressLabel}</span>
                {currentTopicName && !novaFinished && <span> · {currentTopicName}</span>}
              </p>
              <p className="flex-shrink-0 tabular-nums text-slate-600">
                {minutes} min <span className="hidden sm:inline">{es ? '· aprox. 20–30' : '· about 20–30'}</span>
              </p>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-valuetext={progressLabel}
              aria-label={es ? 'Avance de la entrevista' : 'Interview progress'}
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(progress, 0.03) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Mensajes: área con su propio desplazamiento */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={chatContainerRef}
          className="h-full space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
          role="log"
          aria-live="polite"
          aria-label={es ? 'Historial de chat' : 'Chat history'}
        >
          {startFailed ? (
            <div className="mx-auto max-w-sm py-10 text-center" role="alert">
              <p className="text-lg font-semibold text-slate-900">{es ? 'No pudimos conectar con Nova' : 'We could not connect to Nova'}</p>
              <p className="mt-2 text-slate-700">
                {error || (es ? 'Revisa tu conexión a internet e inténtalo de nuevo.' : 'Check your internet connection and try again.')}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={onStartSession}
                  className="min-h-[48px] rounded-xl bg-primary px-4 font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {es ? 'Intentar de nuevo' : 'Try again'}
                </button>
                <button
                  onClick={onBackToWelcome}
                  className="min-h-[44px] rounded-xl px-4 font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {es ? 'Volver al inicio' : 'Back to start'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {transcript.map((msg, index) => (
                <TypingMessage
                  key={msg.id}
                  text={msg.text}
                  sender={msg.sender}
                  timestamp={msg.timestamp}
                  language={language}
                  isLatest={index === transcript.length - 1}
                  speed={20}
                  patientName={patientName}
                  failed={msg.failed}
                  onRetry={msg.failed ? () => onRetryMessage(msg.id) : undefined}
                />
              ))}

              {(isProcessing || isConnecting) && (
                <div className="flex items-center gap-2" aria-label={es ? 'Nova está escribiendo' : 'Nova is typing'}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary" aria-hidden="true">
                    <span className="text-xs font-bold text-white">N</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3" aria-hidden="true">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '300ms' }} />
                  </div>
                  {isConnecting && <span className="text-sm text-slate-600">{es ? 'Nova se está preparando…' : 'Nova is getting ready…'}</span>}
                </div>
              )}
            </>
          )}
        </div>

        {showScrollButton && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={es ? 'Ir al último mensaje' : 'Go to latest message'}
          >
            <svg className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Zona de escritura, siempre visible abajo */}
      {(isListening || isConnecting) && (
        <div className="border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && isListening && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2" role="alert">
              <p className="text-sm text-amber-900">{error}</p>
              <button onClick={onDismissError} className="min-h-[32px] flex-shrink-0 text-sm font-semibold text-amber-900 underline">
                {es ? 'Entendido' : 'OK'}
              </button>
            </div>
          )}

          {novaFinished && isListening && (
            <div className="mb-3 rounded-xl border border-primary-border bg-primary-soft p-3">
              <p className="text-base text-slate-900">
                {es
                  ? 'Nova terminó sus preguntas. Cuando quieras, envía la entrevista a Cabo Health.'
                  : 'Nova has finished her questions. Whenever you are ready, send the interview to Cabo Health.'}
              </p>
              <button
                onClick={() => setEndVariant('ready')}
                className="mt-2 min-h-[48px] w-full rounded-xl bg-primary px-4 font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {es ? 'Enviar a Cabo Health' : 'Send to Cabo Health'}
              </button>
            </div>
          )}

          {(isDictating || dictationError) && (
            <div className="mb-2 px-1 text-sm" aria-live="polite">
              {isDictating ? (
                <p className="flex items-center gap-2 font-medium text-red-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
                  {es ? 'Escuchando… habla y toca el botón rojo al terminar' : 'Listening… speak, then tap the red button when done'}
                </p>
              ) : (
                <p className="text-amber-900">{dictationError}</p>
              )}
              {isDictating && interimText && <p className="mt-1 truncate italic text-slate-600">{interimText}…</p>}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="chat-input" className="sr-only">{es ? 'Tu respuesta' : 'Your answer'}</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  resizeTextarea(e.target);
                }}
                onKeyDown={handleKeyDown}
                placeholder={es ? 'Escribe aquí…' : 'Type here…'}
                disabled={!isListening}
                enterKeyHint="send"
                rows={1}
                className={`block max-h-40 min-h-[52px] w-full resize-none rounded-2xl border-2 border-slate-300 bg-white py-3 pl-4 text-lg leading-snug text-slate-900 transition-colors placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 ${speechSupported ? 'pr-14' : 'pr-4'}`}
              />
              {speechSupported && (
                <button
                  onClick={handleDictation}
                  disabled={!isListening}
                  className={`absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
                    isDictating ? 'bg-red-600 text-white' : 'text-primary hover:bg-primary-soft'
                  }`}
                  aria-pressed={isDictating}
                  aria-label={isDictating ? (es ? 'Detener dictado' : 'Stop dictation') : (es ? 'Dictar con la voz' : 'Dictate with your voice')}
                >
                  {isDictating ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isProcessing || !isListening}
              className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-slate-300 disabled:text-slate-600"
              aria-label={es ? 'Enviar respuesta' : 'Send answer'}
            >
              <SendIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-600">
            {es ? 'Tus respuestas se guardan automáticamente.' : 'Your answers are saved automatically.'}
          </p>
        </div>
      )}

      {endVariant && (
        <ConfirmationModal
          isOpen
          title={endDialog[endVariant].title}
          message={endDialog[endVariant].message}
          confirmText={endDialog[endVariant].confirm}
          cancelText={es ? 'Seguir conversando' : 'Keep talking'}
          onConfirm={confirmEnd}
          onCancel={() => setEndVariant(null)}
          language={language}
          isDangerous={endDialog[endVariant].danger}
        />
      )}
    </section>
  );
};

export default React.memo(TextChatPanel);
