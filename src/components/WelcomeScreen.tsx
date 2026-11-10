import React, { useRef, useState } from 'react';
import { type Language, type InterviewMode } from '../types';
import { MicrophoneIcon, KeyboardIcon } from './icons';
import { sanitizeName, isValidDateOfBirth } from '../utils/patientProfile';
import BrandBackdrop from './BrandBackdrop';

interface WelcomeScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  patientName: string;
  onPatientNameChange: (name: string) => void;
  patientDob: string;
  onPatientDobChange: (dob: string) => void;
  onSelectMode: (mode: InterviewMode) => void;
  voiceAvailable: boolean;
}

export const LanguageToggle: React.FC<{ language: Language; onChange: (lang: Language) => void }> = ({ language, onChange }) => (
  <div
    role="radiogroup"
    aria-label={language === 'es' ? 'Idioma' : 'Language'}
    className="inline-flex flex-shrink-0 rounded-full border border-slate-300 bg-white p-1"
  >
    {(['es', 'en'] as Language[]).map((lang) => (
      <button
        key={lang}
        role="radio"
        aria-checked={language === lang}
        onClick={() => onChange(lang)}
        className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          language === lang ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {lang === 'es' ? 'Español' : 'English'}
      </button>
    ))}
  </div>
);

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  language,
  onLanguageChange,
  patientName,
  onPatientNameChange,
  patientDob,
  onPatientDobChange,
  onSelectMode,
  voiceAvailable,
}) => {
  const es = language === 'es';
  const nameRef = useRef<HTMLInputElement>(null);
  const dobRef = useRef<HTMLInputElement>(null);
  const profileComplete = patientName.trim().length > 0 && isValidDateOfBirth(patientDob);
  // Si ya conocemos sus datos, solo los confirmamos; si no, mostramos el formulario
  const [editing, setEditing] = useState(!profileComplete);
  const [errors, setErrors] = useState<{ name?: string; dob?: string }>({});

  const firstName = patientName.trim().split(/\s+/)[0] ?? '';
  const today = new Date().toISOString().split('T')[0];
  const formattedDob = isValidDateOfBirth(patientDob)
    ? new Date(`${patientDob}T00:00:00`).toLocaleDateString(es ? 'es-MX' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const handleChoose = (mode: InterviewMode) => {
    const nextErrors: { name?: string; dob?: string } = {};
    if (!patientName.trim()) nextErrors.name = es ? 'Escribe tu nombre completo.' : 'Enter your full name.';
    if (!isValidDateOfBirth(patientDob)) nextErrors.dob = es ? 'Elige tu fecha de nacimiento.' : 'Choose your date of birth.';
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.dob) {
      setEditing(true);
      // Esperar a que el formulario se muestre antes de enfocar
      requestAnimationFrame(() => (nextErrors.name ? nameRef : dobRef).current?.focus());
      return;
    }
    onSelectMode(mode);
  };

  const facts = [
    {
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      text: es ? 'Toma entre 20 y 30 minutos' : 'Takes 20 to 30 minutes',
    },
    {
      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      text: es ? 'Solo tu médico verá tus respuestas' : 'Only your doctor will see your answers',
    },
    {
      icon: 'M5 13l4 4L19 7',
      text: es ? 'Se guarda sola: si se corta, sigues donde quedaste' : 'It saves itself: if it cuts out, you pick up where you left off',
    },
  ];

  const inputClass =
    'mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-red-600';

  return (
    <section aria-labelledby="welcome-title">
      {/* Encabezado con la constelación de la marca */}
      <div className="relative isolate overflow-hidden border-b border-slate-200/60">
        <BrandBackdrop density="soft" className="-z-10" />
        <div className="mx-auto w-full max-w-xl animate-fade-in-up px-4 pb-6 pt-4 sm:pb-12 sm:pt-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-sea sm:tracking-[0.35em]">
          {es ? 'Antes de tu consulta' : 'Before your appointment'}
        </p>
        <LanguageToggle language={language} onChange={onLanguageChange} />
      </div>
      <div className="mt-2 h-px w-20 origin-left animate-rule-in bg-gradient-to-r from-brand-bronze to-transparent" aria-hidden="true" />
      <h1
        id="welcome-title"
        className="mt-3 bg-gradient-to-b from-brand-navy to-brand-deep bg-clip-text font-display text-5xl font-semibold leading-tight tracking-tight text-transparent sm:text-6xl"
      >
        {es ? 'Hola' : 'Hello'}{firstName ? `, ${firstName}` : ''}
      </h1>

      <p className="mt-2 text-base leading-relaxed text-slate-700 sm:text-lg">
        {es
          ? 'Antes de tu cita, Nova, nuestra asistente, te hará algunas preguntas sobre tu salud. Tu médico recibirá un resumen para conocerte mejor.'
          : 'Before your appointment, Nova, our assistant, will ask you some questions about your health. Your doctor will receive a summary to get to know you better.'}
      </p>

      <ul className="mt-4 space-y-2">
        {facts.map((fact) => (
          <li key={fact.text} className="flex items-center gap-3 text-base text-slate-700">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary-border/70 bg-white/80 text-primary" aria-hidden="true">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={fact.icon} />
              </svg>
            </span>
            {fact.text}
          </li>
        ))}
      </ul>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-4 pb-10">

      {/* Datos del paciente: se piden una vez y se recuerdan */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-brand-deep/5">
        {editing ? (
          <fieldset>
            <legend className="text-base font-semibold text-slate-900">{es ? 'Tus datos' : 'Your details'}</legend>
            <p className="text-sm text-slate-600">
              {es ? 'Los pedimos una sola vez para que tu médico sepa quién eres.' : 'We ask only once so your doctor knows who you are.'}
            </p>

            <label htmlFor="patient-name" className="mt-4 block text-sm font-medium text-slate-800">
              {es ? 'Nombre y apellidos' : 'Full name'}
            </label>
            <input
              ref={nameRef}
              id="patient-name"
              type="text"
              autoComplete="name"
              value={patientName}
              onChange={(e) => onPatientNameChange(sanitizeName(e.target.value))}
              className={inputClass}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'patient-name-error' : undefined}
              maxLength={100}
            />
            {errors.name && <p id="patient-name-error" className="mt-1 text-sm text-red-700">{errors.name}</p>}

            <label htmlFor="patient-dob" className="mt-4 block text-sm font-medium text-slate-800">
              {es ? 'Fecha de nacimiento' : 'Date of birth'}
            </label>
            <input
              ref={dobRef}
              id="patient-dob"
              type="date"
              autoComplete="bday"
              value={patientDob}
              max={today}
              min="1900-01-01"
              onChange={(e) => onPatientDobChange(e.target.value)}
              className={inputClass}
              aria-invalid={!!errors.dob}
              aria-describedby={errors.dob ? 'patient-dob-error' : undefined}
            />
            {errors.dob && <p id="patient-dob-error" className="mt-1 text-sm text-red-700">{errors.dob}</p>}
          </fieldset>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-600">{es ? 'Responderás como' : 'You will answer as'}</p>
              <p className="truncate text-lg font-semibold text-slate-900">{patientName}</p>
              <p className="text-sm text-slate-600">{formattedDob}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="min-h-[44px] flex-shrink-0 rounded-lg px-3 font-semibold text-primary transition-colors hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {es ? 'Cambiar' : 'Edit'}
            </button>
          </div>
        )}
      </div>

      <h2 className="mt-6 text-xl font-semibold text-slate-900">{es ? '¿Cómo prefieres responder?' : 'How would you like to answer?'}</h2>

      <div className="mt-4 flex flex-col gap-3">
        {/* Escribir va primero: funciona en cualquier lugar y no depende del micrófono */}
        <button
          onClick={() => handleChoose('TEXT')}
          className="group flex w-full items-center gap-4 rounded-2xl bg-primary p-5 text-left text-white shadow-md transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-[0.99]"
        >
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
            <KeyboardIcon className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold">{es ? 'Escribir' : 'Write'}</span>
            <span className="block text-base text-white/90">
              {es ? 'Respondes por escrito, a tu ritmo. También puedes dictar.' : 'Answer in writing, at your own pace. You can also dictate.'}
            </span>
          </span>
        </button>

        <button
          onClick={() => handleChoose('VOICE')}
          disabled={!voiceAvailable}
          className="group flex w-full items-center gap-4 rounded-2xl border-2 border-primary bg-white p-5 text-left text-slate-900 transition-colors hover:bg-primary-soft focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
        >
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary group-disabled:bg-slate-200 group-disabled:text-slate-500" aria-hidden="true">
            <MicrophoneIcon className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold">{es ? 'Hablar' : 'Talk'}</span>
            <span className="block text-base text-slate-700 group-disabled:text-slate-500">
              {voiceAvailable
                ? (es ? 'Conversas en voz alta con Nova. Necesitas micrófono y un lugar tranquilo.' : 'Talk out loud with Nova. You need a microphone and a quiet place.')
                : (es ? 'No disponible por ahora. Puedes responder por escrito.' : 'Not available right now. You can answer in writing.')}
            </span>
          </span>
        </button>
      </div>
      </div>
    </section>
  );
};

export default WelcomeScreen;
