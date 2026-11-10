import React, { useState } from 'react';
import { type AppState, type Language, type TranscriptMessage } from '../types';
import ConsultationHistory from './ConsultationHistory';
import ConfirmationModal from './ConfirmationModal';
import BrandBackdrop from './BrandBackdrop';
import { renderRichText } from '../utils/richText';

interface FinishScreenProps {
  language: Language;
  appState: AppState; // PROCESSING | COMPLETED | ERROR
  patientName: string;
  transcript: TranscriptMessage[];
  summaryFailed: boolean;
  tooShort: boolean;
  onRetrySummary: () => void;
  onNewInterview: () => void;
}

/**
 * Lo que ve el paciente al terminar. La entrevista ya quedó guardada para el médico
 * (pending_summaries + consultations), así que nunca se le pide un paso extra.
 */
const FinishScreen: React.FC<FinishScreenProps> = ({
  language,
  appState,
  patientName,
  transcript,
  summaryFailed,
  tooShort,
  onRetrySummary,
  onNewInterview,
}) => {
  const es = language === 'es';
  const firstName = patientName.trim().split(/\s+/)[0] ?? '';
  const [showHistory, setShowHistory] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const primaryButton =
    'min-h-[52px] w-full rounded-xl bg-primary px-5 text-lg font-semibold text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40';
  const secondaryButton =
    'min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  const SavedBadge = () => (
    <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
      {es ? 'Tu entrevista está guardada' : 'Your interview is saved'}
    </p>
  );

  let content: React.ReactNode;

  if (appState === 'PROCESSING') {
    content = (
      <div role="status" aria-live="polite">
        <SavedBadge />
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-brand-navy">
          {es ? 'Preparando el resumen para tu médico' : 'Preparing the summary for your doctor'}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-700">
          {es
            ? 'Esto puede tardar unos minutos. No necesitas hacer nada más: si cierras esta página, tu médico recibirá tu entrevista de todos modos.'
            : 'This can take a few minutes. You do not need to do anything else: if you close this page, your doctor will still receive your interview.'}
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div className="animate-shimmer h-full w-full rounded-full bg-gradient-to-r from-brand-deep via-brand-mist to-brand-deep" />
        </div>
      </div>
    );
  } else if (appState === 'COMPLETED') {
    content = (
      <div role="status">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary-border bg-white shadow-sm" aria-hidden="true">
          <svg className="h-9 w-9 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-brand-navy">
          {es ? '¡Listo' : 'All done'}{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-700">
          {es ? 'Tu médico ya recibió tu entrevista y el resumen.' : 'Your doctor has received your interview and the summary.'}
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">{es ? '¿Qué sigue?' : "What's next?"}</h2>
          <p className="mt-1 text-base leading-relaxed text-slate-700">
            {es
              ? 'Tu médico lo revisará antes de tu cita. Si algo cambia en tu salud antes de la consulta, coméntaselo directamente.'
              : 'Your doctor will review it before your appointment. If anything about your health changes before then, tell them directly.'}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={() => setShowHistory(true)} className={secondaryButton}>
            {es ? 'Ver mis entrevistas' : 'See my interviews'}
          </button>
          <button
            onClick={() => setConfirmNew(true)}
            className="min-h-[44px] rounded-xl px-4 font-semibold text-primary transition-colors hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {es ? 'Hacer otra entrevista' : 'Start another interview'}
          </button>
        </div>
      </div>
    );
  } else if (tooShort) {
    content = (
      <div role="alert">
        <h1 className="font-display text-4xl font-semibold leading-tight text-brand-navy">{es ? 'La conversación fue muy corta' : 'The conversation was very short'}</h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-700">
          {es
            ? 'No hubo suficiente información para enviarla a tu médico. Puedes empezar de nuevo cuando quieras.'
            : 'There was not enough information to send to your doctor. You can start again whenever you like.'}
        </p>
        <button onClick={onNewInterview} className={`${primaryButton} mt-6`}>
          {es ? 'Empezar de nuevo' : 'Start again'}
        </button>
      </div>
    );
  } else {
    // El resumen automático falló, pero la entrevista sí llegó al médico
    content = (
      <div role="alert">
        <SavedBadge />
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-brand-navy">
          {es ? 'Tu médico recibirá tu entrevista' : 'Your doctor will receive your interview'}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-700">
          {es
            ? 'No pudimos preparar el resumen automático en este momento. Puedes intentarlo otra vez o simplemente cerrar esta página.'
            : 'We could not prepare the automatic summary right now. You can try again or simply close this page.'}
        </p>
        {summaryFailed && (
          <button onClick={onRetrySummary} className={`${primaryButton} mt-6`}>
            {es ? 'Intentar de nuevo' : 'Try again'}
          </button>
        )}
      </div>
    );
  }

  const visibleMessages = transcript.filter(m => !m.failed);

  return (
    <section className="relative isolate min-h-full overflow-hidden">
      {/* La constelación acompaña el cierre, más tenue para no competir con el texto */}
      {appState !== 'ERROR' && <BrandBackdrop density="soft" className="-z-10" />}
      <div className="mx-auto w-full max-w-xl animate-fade-in-up px-4 py-8 sm:py-12">
      {content}

      {visibleMessages.length > 0 && (
        <details className="group mt-8 rounded-2xl border border-slate-200 bg-white">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 font-semibold text-slate-900">
            {es ? 'Ver tu conversación' : 'See your conversation'}
            <svg className="h-5 w-5 text-slate-600 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <ol className="max-h-[50vh] space-y-3 overflow-y-auto border-t border-slate-200 p-4">
            {visibleMessages.map((msg) => (
              <li key={msg.id} className="text-base leading-relaxed text-slate-800">
                <span className="font-semibold text-slate-900">{msg.sender === 'Nova' ? 'Nova' : (es ? 'Tú' : 'You')}: </span>
                <span className="whitespace-pre-wrap">{renderRichText(msg.text)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      </div>

      {showHistory && <ConsultationHistory language={language} onClose={() => setShowHistory(false)} userRole="patient" />}

      <ConfirmationModal
        isOpen={confirmNew}
        title={es ? '¿Hacer otra entrevista?' : 'Start another interview?'}
        message={es
          ? 'La entrevista que acabas de terminar ya está con tu médico. Empezarás una nueva desde el principio.'
          : 'The interview you just finished is already with your doctor. You will start a new one from the beginning.'}
        confirmText={es ? 'Empezar otra' : 'Start another'}
        cancelText={es ? 'Cancelar' : 'Cancel'}
        onConfirm={() => {
          setConfirmNew(false);
          onNewInterview();
        }}
        onCancel={() => setConfirmNew(false)}
        language={language}
      />
    </section>
  );
};

export default FinishScreen;
