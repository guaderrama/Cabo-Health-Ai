import React from 'react';
import type { RecoverableSession } from '../types';

interface SessionRecoveryModalProps {
  sessions: RecoverableSession[];
  onRecover: (session: RecoverableSession) => void;
  onDismiss: () => void;
  language: 'es' | 'en';
}

const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
  sessions,
  onRecover,
  onDismiss,
  language,
}) => {
  const texts = {
    es: {
      title: 'Sesión Interrumpida Detectada',
      subtitle: 'Encontramos una entrevista que no terminaste. Puedes continuar donde la dejaste.',
      patient: 'Paciente',
      messages: 'mensajes',
      time: 'Tiempo transcurrido',
      lastSaved: 'Guardado',
      recoverButton: 'Continuar Entrevista',
      dismissButton: 'Empezar Nueva Sesión',
      warning: 'Si empiezas una nueva sesión, perderás el progreso de la sesión anterior.',
    },
    en: {
      title: 'Interrupted Session Detected',
      subtitle: 'We found an interview you didn\'t finish. You can continue where you left off.',
      patient: 'Patient',
      messages: 'messages',
      time: 'Elapsed time',
      lastSaved: 'Saved',
      recoverButton: 'Continue Interview',
      dismissButton: 'Start New Session',
      warning: 'If you start a new session, you will lose the progress from the previous session.',
    },
  };

  const t = texts[language];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return language === 'es' ? 'hace un momento' : 'just now';
    if (diffMins < 60) return language === 'es' ? `hace ${diffMins} min` : `${diffMins} min ago`;
    if (diffHours < 24) return language === 'es' ? `hace ${diffHours}h` : `${diffHours}h ago`;
    return language === 'es' ? `hace ${diffDays} días` : `${diffDays} days ago`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
          <h2 className="text-2xl font-bold text-white mb-2">{t.title}</h2>
          <p className="text-blue-100">{t.subtitle}</p>
        </div>

        {/* Sessions List */}
        <div className="p-6 space-y-4">
          {sessions.map((session, index) => (
            <div
              key={session.checkpoint.session_id}
              className="border-2 border-blue-200 rounded-lg p-5 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-semibold text-slate-800">
                      {t.patient}: {session.checkpoint.patient_name || (language === 'es' ? 'Sin nombre' : 'No name')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span>{session.checkpoint.message_count} {t.messages}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t.time}: {session.formattedTime}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-slate-500">
                    {t.lastSaved}: {formatDate(session.checkpoint.last_checkpoint_time)}
                  </div>
                </div>

                <button
                  onClick={() => onRecover(session)}
                  className="ml-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t.recoverButton}
                </button>
              </div>

              {/* Preview del último mensaje */}
              {session.checkpoint.transcript.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-100">
                  <p className="text-xs text-slate-500 mb-1">
                    {language === 'es' ? 'Último mensaje:' : 'Last message:'}
                  </p>
                  <p className="text-sm text-slate-700 line-clamp-2">
                    {(() => {
                      const lastMsg = session.checkpoint.transcript[session.checkpoint.transcript.length - 1];
                      if (!lastMsg) return null;
                      return (
                        <>
                          <span className="font-medium">
                            {lastMsg.sender === 'Nova' ? 'Nova: ' : (language === 'es' ? 'Tú: ' : 'You: ')}
                          </span>
                          {lastMsg.text}
                        </>
                      );
                    })()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Warning and Dismiss Button */}
        <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-xl">
          <div className="flex items-start gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">{t.warning}</p>
          </div>
          
          <button
            onClick={onDismiss}
            className="w-full px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 font-medium border-2 border-slate-300 rounded-lg transition-colors"
          >
            {t.dismissButton}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionRecoveryModal;
