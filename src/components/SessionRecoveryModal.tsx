import React, { useState } from 'react';
import type { RecoverableSession, Language } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SessionRecoveryModalProps {
  sessions: RecoverableSession[];
  onRecover: (session: RecoverableSession) => void;
  onDismiss: () => void;
  language: Language;
}

function timeAgo(timestamp: number, language: Language): string {
  const rtf = new Intl.RelativeTimeFormat(language === 'es' ? 'es' : 'en', { numeric: 'auto' });
  const minutes = Math.round((timestamp - Date.now()) / 60000);
  if (Math.abs(minutes) < 1) return language === 'es' ? 'hace un momento' : 'just now';
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  return rtf.format(hours, 'hour');
}

const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({ sessions, onRecover, onDismiss, language }) => {
  const es = language === 'es';
  const focusTrapRef = useFocusTrap(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Normalmente hay una sola; si hay varias, se ofrece la más reciente
  const session = [...sessions].sort((a, b) => b.checkpoint.last_checkpoint_time - a.checkpoint.last_checkpoint_time)[0];
  if (!session) return null;

  const { checkpoint } = session;
  const answers = checkpoint.transcript.filter(m => m.sender === 'You').length;
  const lastNova = [...checkpoint.transcript].reverse().find(m => m.sender === 'Nova');

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        className="modal-enter flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="overflow-y-auto p-6">
          <h2 id="recovery-title" className="text-2xl font-bold text-slate-900">
            {es ? 'Tienes una entrevista sin terminar' : 'You have an unfinished interview'}
          </h2>
          <p className="mt-2 text-base text-slate-700">
            {es
              ? `Se guardó ${timeAgo(checkpoint.last_checkpoint_time, language)}. Puedes seguir justo donde te quedaste.`
              : `It was saved ${timeAgo(checkpoint.last_checkpoint_time, language)}. You can pick up right where you left off.`}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div>
              <dt className="text-slate-600">{es ? 'Paciente' : 'Patient'}</dt>
              <dd className="truncate font-semibold text-slate-900">{checkpoint.patient_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-600">{es ? 'Respuestas' : 'Answers'}</dt>
              <dd className="font-semibold text-slate-900">{answers}</dd>
            </div>
          </dl>

          {lastNova && (
            <div className="mt-4">
              <p className="text-sm text-slate-600">{es ? 'Lo último que preguntó Nova:' : 'Nova last asked:'}</p>
              <p className="mt-1 line-clamp-3 text-base italic text-slate-800">“{lastNova.text}”</p>
            </div>
          )}

          {confirmDiscard && (
            <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              {es
                ? 'Si empiezas una nueva, ya no podrás continuar esta. Toca otra vez para confirmar.'
                : 'If you start a new one, you will not be able to continue this one. Tap again to confirm.'}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => onRecover(session)}
            autoFocus
            className="min-h-[52px] rounded-xl bg-primary px-5 text-lg font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            {es ? 'Continuar donde me quedé' : 'Continue where I left off'}
          </button>
          <button
            onClick={() => (confirmDiscard ? onDismiss() : setConfirmDiscard(true))}
            className={`min-h-[48px] rounded-xl px-5 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              confirmDiscard ? 'bg-red-700 text-white hover:bg-red-800' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {confirmDiscard ? (es ? 'Sí, empezar una nueva' : 'Yes, start a new one') : (es ? 'Empezar una nueva' : 'Start a new one')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionRecoveryModal;
