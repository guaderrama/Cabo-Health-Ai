import React, { useState, useEffect } from 'react';
import { type AppState, type Language, type InterviewModule } from '../types';
import { MODULE_CONFIGS } from '../constants';
import ListeningVisualizer from './ListeningVisualizer';
import { MicrophoneIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';

interface ControlPanelProps {
  appState: AppState;
  language: Language;
  onStartSession: () => void;
  onEndSession: () => void;
  /** Salir sin enviar cuando casi no hubo conversación. */
  onDiscardSession: () => void;
  audioFrequency: number;
  error: string | null;
  onOpenDiagnostic?: () => void;
  onRetry?: () => void;
  waitingForNova?: boolean;
  currentModule?: InterviewModule;
  completedModules?: InterviewModule[];
  isTransitioningModule?: boolean;
  /** Hay conversación guardada (sesión recuperada o reconexión). */
  hasConversation: boolean;
  patientMessageCount: number;
  sessionStartTime: number;
  onSwitchToText: () => void;
  onBackToWelcome: () => void;
}

type EndVariant = 'too_short' | 'incomplete' | 'ready';

const ControlPanel: React.FC<ControlPanelProps> = ({
  appState,
  language,
  onStartSession,
  onEndSession,
  onDiscardSession,
  audioFrequency,
  error,
  onOpenDiagnostic,
  onRetry,
  waitingForNova,
  currentModule = 'MODULE_1',
  completedModules = [],
  isTransitioningModule = false,
  hasConversation,
  patientMessageCount,
  sessionStartTime,
  onSwitchToText,
  onBackToWelcome,
}) => {
  const es = language === 'es';
  const isIdle = appState === 'IDLE';
  const isConnecting = appState === 'CONNECTING';
  const isListening = appState === 'LISTENING';
  const isError = appState === 'ERROR';
  const [endVariant, setEndVariant] = useState<EndVariant | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isListening || !sessionStartTime) return undefined;
    const tick = () => setElapsedMs(Date.now() - sessionStartTime);
    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, [isListening, sessionStartTime]);

  const moduleNumber = Number(currentModule.replace('MODULE_', ''));
  const moduleName = MODULE_CONFIGS[currentModule][es ? 'nameEs' : 'name'];
  const isMicError = !!error && /micr[oó]fono|microphone/i.test(error);

  const openEndDialog = () => {
    if (patientMessageCount < 2) setEndVariant('too_short');
    else if (currentModule !== 'MODULE_3') setEndVariant('incomplete');
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
        ? `Van en la parte ${moduleNumber} de 3. Si terminas ahora, tu médico recibirá una entrevista incompleta.`
        : `You are on part ${moduleNumber} of 3. If you finish now, your doctor will receive an incomplete interview.`,
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

  const primaryButton =
    'inline-flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-lg font-bold text-white shadow-md transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:bg-slate-400';
  const secondaryButton =
    'min-h-[44px] rounded-xl px-4 font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <section
      className="flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm"
      aria-label={es ? 'Conversación por voz con Nova' : 'Voice conversation with Nova'}
    >
      <h1 className="sr-only">{es ? 'Hablar con Nova' : 'Talk with Nova'}</h1>

      {/* Antes de empezar */}
      {isIdle && !hasConversation && (
        <div className="w-full max-w-sm">
          <h2 className="font-display text-4xl font-semibold leading-tight text-brand-navy">{es ? 'Antes de empezar' : 'Before you start'}</h2>
          <div className="mt-2 h-px w-16 bg-gradient-to-r from-brand-bronze to-transparent" aria-hidden="true" />
          <ul className="mt-4 space-y-3 text-base text-slate-700">
            {[
              { icon: 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2', text: es ? 'Busca un lugar tranquilo, sin ruido de fondo.' : 'Find a quiet place without background noise.' },
              { icon: 'M19 11a7 7 0 01-14 0m7 7v3m-4 0h8M12 15a3 3 0 003-3V5a3 3 0 10-6 0v7a3 3 0 003 3z', text: es ? 'Tu navegador te pedirá permiso para usar el micrófono: toca "Permitir".' : 'Your browser will ask to use the microphone: tap "Allow".' },
              { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', text: es ? 'Habla con naturalidad. Nova te escucha y te responde en voz alta.' : 'Speak naturally. Nova listens and answers out loud.' },
              { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', text: es ? 'Son 3 partes, entre 20 y 30 minutos en total.' : 'There are 3 parts, 20 to 30 minutes in total.' },
            ].map((tip) => (
              <li key={tip.text} className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary-border/70 bg-white text-primary" aria-hidden="true">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tip.icon} />
                  </svg>
                </span>
                <span className="pt-1.5">{tip.text}</span>
              </li>
            ))}
          </ul>
          <button onClick={onStartSession} className={`${primaryButton} mt-6`}>
            <MicrophoneIcon className="h-6 w-6" />
            {es ? 'Empezar a hablar' : 'Start talking'}
          </button>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button onClick={onSwitchToText} className={secondaryButton}>{es ? 'Prefiero escribir' : 'I prefer to write'}</button>
            <button onClick={onBackToWelcome} className={secondaryButton}>{es ? 'Volver' : 'Back'}</button>
          </div>
        </div>
      )}

      {/* Continuar una conversación guardada */}
      {isIdle && hasConversation && (
        <div className="w-full max-w-sm text-center">
          <h2 className="font-display text-4xl font-semibold leading-tight text-brand-navy">{es ? 'Continuemos' : "Let's continue"}</h2>
          <p className="mt-2 text-base text-slate-700">
            {es ? 'Tu conversación está guardada. Nova seguirá donde se quedaron.' : 'Your conversation is saved. Nova will pick up where you left off.'}
          </p>
          <button onClick={onStartSession} className={`${primaryButton} mt-6`}>
            <MicrophoneIcon className="h-6 w-6" />
            {es ? 'Continuar conversación' : 'Continue conversation'}
          </button>
        </div>
      )}

      {(isConnecting || isListening) && (
        <>
          <ListeningVisualizer isListening={isListening} audioFrequency={audioFrequency} sizeClassName="w-48 h-48 sm:w-64 sm:h-64" />

          <div className="mt-4 text-center" role="status" aria-live="polite">
            <p className="text-lg font-semibold text-slate-900">
              {isConnecting
                ? (es ? 'Conectando con Nova…' : 'Connecting to Nova…')
                : isTransitioningModule
                  ? (es ? 'Preparando la siguiente parte…' : 'Getting the next part ready…')
                  : waitingForNova
                    ? (es ? 'Nova está pensando…' : 'Nova is thinking…')
                    : (es ? 'Nova te escucha. Habla con naturalidad.' : 'Nova is listening. Speak naturally.')}
            </p>
            {isConnecting && (
              <p className="mt-1 text-sm text-slate-600">
                {es ? 'Si tu navegador pide permiso para el micrófono, toca "Permitir".' : 'If your browser asks for microphone access, tap "Allow".'}
              </p>
            )}
          </div>

          {isListening && (
            <div className="mt-5 w-full max-w-xs space-y-4">
              <div>
                <p className="mb-1 text-center text-sm text-slate-600">{es ? 'Nivel de tu voz' : 'Your voice level'}</p>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(audioFrequency / 100, 1) * 100}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-primary-border bg-primary-soft p-3">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-900">{es ? `Parte ${moduleNumber} de 3` : `Part ${moduleNumber} of 3`}</span>
                  <span className="tabular-nums text-slate-700">{Math.floor(elapsedMs / 60000)} min</span>
                </div>
                <p className="text-sm text-slate-700">{moduleName}</p>
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  {(['MODULE_1', 'MODULE_2', 'MODULE_3'] as InterviewModule[]).map((mod) => (
                    <div
                      key={mod}
                      className={`h-1.5 flex-1 rounded-full ${
                        completedModules.includes(mod) ? 'bg-primary' : mod === currentModule ? 'bg-primary/50' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={openEndDialog}
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 bg-white px-4 font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {currentModule === 'MODULE_3' ? (es ? 'Terminar y enviar a Cabo Health' : 'Finish and send to Cabo Health') : (es ? 'Terminar' : 'Finish')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Avisos mientras la conversación sigue (p. ej. "Nova está tardando") */}
      {isListening && error && (
        <div className="mt-4 w-full max-w-sm rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900" role="status">
          <p>{error}</p>
          {isMicError && onOpenDiagnostic && (
            <button onClick={onOpenDiagnostic} className="mt-1 min-h-[40px] font-semibold underline">
              {es ? 'Revisar mi micrófono' : 'Check my microphone'}
            </button>
          )}
        </div>
      )}

      {isError && (
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
          <h2 className="text-lg font-semibold text-red-900">{es ? 'Algo salió mal' : 'Something went wrong'}</h2>
          <p className="mt-1 whitespace-pre-line text-base text-red-900">{error}</p>
          {hasConversation && (
            <p className="mt-2 text-sm text-slate-700">{es ? 'Tu conversación está guardada.' : 'Your conversation is saved.'}</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            {onRetry && (
              <button onClick={onRetry} className={primaryButton}>
                {es ? 'Reintentar' : 'Try again'}
              </button>
            )}
            {isMicError && onOpenDiagnostic && (
              <button onClick={onOpenDiagnostic} className={`${secondaryButton} border border-slate-300 bg-white`}>
                {es ? 'Revisar mi micrófono' : 'Check my microphone'}
              </button>
            )}
            {!hasConversation && (
              <button onClick={onSwitchToText} className={secondaryButton}>
                {es ? 'Prefiero escribir' : 'I prefer to write'}
              </button>
            )}
          </div>
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

export default React.memo(ControlPanel);
