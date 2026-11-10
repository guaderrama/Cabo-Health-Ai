import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type Language } from '../types';
import { UI_TEXTS } from '../constants';
import ConsultationHistory from './ConsultationHistory';
import ConfirmationModal from './ConfirmationModal';
import { logger } from '../lib/logger';

interface HeaderProps {
  language: Language;
  welcomeSoundEnabled?: boolean;
  onToggleWelcomeSound?: () => void;
  isOnline?: boolean;
  userRole?: 'patient' | 'doctor';
  /** Patients: true while an interview is running, so leaving warns that it stays saved. */
  interviewInProgress?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  language,
  welcomeSoundEnabled,
  onToggleWelcomeSound,
  isOnline = true,
  userRole = 'patient',
  interviewInProgress = false,
}) => {
  const { user, signOut } = useAuth();
  const texts = UI_TEXTS[language];
  const es = language === 'es';
  const isPatient = userRole === 'patient';
  const [showHistory, setShowHistory] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setConfirmSignOut(false);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      logger.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const iconButton =
    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3 font-semibold text-brand-deep transition-colors hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-primary focus:shadow-lg"
      >
        {es ? 'Ir al contenido principal' : 'Skip to main content'}
      </a>
      <header
        role="banner"
        className={`${isPatient ? 'sticky' : 'fixed left-0 right-0'} top-0 z-50 border-b border-slate-200/80 bg-brand-cream text-brand-navy`}
      >
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-3"
          aria-label={es ? 'Navegación principal' : 'Main navigation'}
        >
          <div className="min-w-0">
            {/* Patients get their page heading (h1) inside each screen; the doctor dashboard relies on this one */}
            {isPatient ? (
              <p className="truncate font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                Cabo Health <span className="text-brand-sea">Nova</span>
              </p>
            ) : (
              <h1 className="truncate font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{texts.title}</h1>
            )}
            <p className="hidden truncate text-sm text-brand-sea sm:block">
              {isPatient
                ? (es ? 'Tu entrevista antes de la consulta' : 'Your interview before your appointment')
                : texts.subtitle}
            </p>
          </div>

          {user && (
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className={iconButton}
                aria-label={isPatient ? (es ? 'Mis entrevistas' : 'My interviews') : (es ? 'Consultas' : 'Consultations')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">
                  {isPatient ? (es ? 'Mis entrevistas' : 'My interviews') : (es ? 'Consultas' : 'Consultations')}
                </span>
              </button>

              {onToggleWelcomeSound && welcomeSoundEnabled !== undefined && (
                <button
                  onClick={onToggleWelcomeSound}
                  className={`${iconButton} hidden md:inline-flex`}
                  aria-pressed={welcomeSoundEnabled}
                  aria-label={es ? 'Sonido de bienvenida' : 'Welcome sound'}
                  title={es ? 'Sonido de bienvenida al empezar a hablar' : 'Welcome sound when starting to talk'}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    {welcomeSoundEnabled ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    )}
                  </svg>
                </button>
              )}

              <p className="hidden max-w-[200px] truncate text-sm text-slate-600 lg:block">{user.email}</p>

              <button
                onClick={() => setConfirmSignOut(true)}
                disabled={isSigningOut}
                className={iconButton}
                aria-label={es ? 'Salir de tu cuenta' : 'Sign out'}
              >
                {isSigningOut ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                <span className="hidden sm:inline">{es ? 'Salir' : 'Sign out'}</span>
              </button>
            </div>
          )}
        </nav>

        {!isOnline && (
          <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
            {es
              ? 'Sin conexión a internet. Lo que ya respondiste está guardado; revisa tu conexión para continuar.'
              : 'No internet connection. What you already answered is saved; check your connection to continue.'}
          </div>
        )}
      </header>

      {showHistory && (
        <ConsultationHistory language={language} onClose={() => setShowHistory(false)} userRole={userRole} />
      )}

      <ConfirmationModal
        isOpen={confirmSignOut}
        title={es ? '¿Salir de tu cuenta?' : 'Sign out?'}
        message={
          interviewInProgress
            ? (es
              ? 'Tu entrevista quedará guardada y podrás continuarla cuando vuelvas a entrar.'
              : 'Your interview will be saved and you can continue it when you sign back in.')
            : (es ? 'Podrás volver a entrar con tu correo y contraseña.' : 'You can sign back in with your email and password.')
        }
        confirmText={es ? 'Salir' : 'Sign out'}
        cancelText={es ? 'Quedarme' : 'Stay'}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(false)}
        language={language}
      />
    </>
  );
};

export default React.memo(Header);
