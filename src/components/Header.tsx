import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { type Language } from '../types';
import { UI_TEXTS } from '../constants';
import ConsultationHistory from './ConsultationHistory';

interface HeaderProps {
  language: Language;
}

const Header: React.FC<HeaderProps> = ({ language }) => {
  const { user, signOut } = useAuth();
  const texts = UI_TEXTS[language];
  const [showHistory, setShowHistory] = useState(false);

  const handleSignOut = async () => {
    if (confirm(language === 'es' ? '¿Seguro que deseas cerrar sesión?' : 'Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg z-50">
      <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{texts.title}</h1>
          <p className="text-sm sm:text-base opacity-90">{texts.subtitle}</p>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{language === 'es' ? 'Mis Consultas' : 'My Consultations'}</span>
            </button>
            <div className="hidden sm:block text-right">
              <p className="text-sm opacity-90">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors backdrop-blur-sm"
            >
              {language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
            </button>
          </div>
        )}
      </div>
    </header>
    
    {showHistory && (
      <ConsultationHistory language={language} onClose={() => setShowHistory(false)} />
    )}
    </>
  );
};

export default React.memo(Header);
