import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type Language } from '../types';
import { UI_TEXTS } from '../constants';
import ConsultationHistory from './ConsultationHistory';
import { logger } from '../lib/logger';

interface HeaderProps {
  language: Language;
  welcomeSoundEnabled?: boolean;
  onToggleWelcomeSound?: () => void;
  isOnline?: boolean;
  userRole?: 'patient' | 'doctor';
}

const Header: React.FC<HeaderProps> = ({ language, welcomeSoundEnabled, onToggleWelcomeSound, isOnline = true, userRole = 'patient' }) => {
  const { user, signOut } = useAuth();
  const texts = UI_TEXTS[language];
  const [showHistory, setShowHistory] = useState(false);

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevenir doble-click

    if (confirm(language === 'es' ? '¿Seguro que deseas cerrar sesión?' : 'Are you sure you want to sign out?')) {
      setIsSigningOut(true);
      try {
        await signOut();
      } catch (error) {
        logger.error('Error signing out:', error);
        setIsSigningOut(false);
      }
    }
  };

  return (
    <>
    {/* Skip link for keyboard navigation */}
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded-lg focus:font-semibold focus:shadow-lg"
    >
      {language === 'es' ? 'Ir al contenido principal' : 'Skip to main content'}
    </a>
    <header role="banner" className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg z-50">
      <nav className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between" aria-label={language === 'es' ? 'Navegación principal' : 'Main navigation'}>
        <div className="flex items-center gap-3">
          {/* Indicador de conexión */}
          <div className="flex items-center gap-2" title={isOnline ? (language === 'es' ? 'Conectado' : 'Online') : (language === 'es' ? 'Sin conexión' : 'Offline')}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{texts.title}</h1>
            <p className="text-sm sm:text-base opacity-90">{texts.subtitle}</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            {/* Botón móvil (solo icono) */}
            <button
              onClick={() => setShowHistory(true)}
              className="flex sm:hidden items-center p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm active:scale-95"
              aria-label={language === 'es' ? 'Mis Consultas' : 'My Consultations'}
              title={language === 'es' ? 'Ver historial de consultas' : 'View consultation history'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            {/* Botón desktop (con texto) */}
            <button
              onClick={() => setShowHistory(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors backdrop-blur-sm active:scale-95"
              title={language === 'es' ? 'Ver todas tus consultas anteriores' : 'View all your previous consultations'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{language === 'es' ? 'Mis Consultas' : 'My Consultations'}</span>
            </button>
            {onToggleWelcomeSound && welcomeSoundEnabled !== undefined && (
              <button
                onClick={onToggleWelcomeSound}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm active:scale-95"
                title={welcomeSoundEnabled
                  ? (language === 'es' ? 'Desactivar saludo de voz de Nova' : 'Disable Nova voice greeting')
                  : (language === 'es' ? 'Activar saludo de voz de Nova' : 'Enable Nova voice greeting')
                }
              >
                {welcomeSoundEnabled ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>
            )}
            <div className="hidden sm:block text-right">
              <p className="text-sm opacity-90">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              title={language === 'es' ? 'Cerrar tu sesión de usuario' : 'Sign out of your account'}
            >
              {isSigningOut ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  {language === 'es' ? 'Cerrando...' : 'Signing out...'}
                </span>
              ) : (
                language === 'es' ? 'Cerrar Sesión' : 'Sign Out'
              )}
            </button>
          </div>
        )}
      </nav>
    </header>
    
    {showHistory && (
      <ConsultationHistory language={language} onClose={() => setShowHistory(false)} userRole={userRole} />
    )}
    </>
  );
};

export default React.memo(Header);
