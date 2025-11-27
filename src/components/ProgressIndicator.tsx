import React, { useEffect, useState } from 'react';

interface ProgressIndicatorProps {
  messageCount: number;
  sessionStartTime: number;
  lastCheckpointTime: number | null;
  isSaving: boolean;
  language: 'es' | 'en';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  messageCount,
  sessionStartTime,
  lastCheckpointTime,
  isSaving,
  language,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  const texts = {
    es: {
      messages: 'preguntas respondidas',
      elapsed: 'Tiempo transcurrido',
      saving: 'Guardando...',
      saved: 'Guardado',
      autoSave: 'Guardado automático activo',
      dataProtected: 'Tus datos están protegidos',
      longSessionWarning: 'Sesión larga - Todo guardado',
    },
    en: {
      messages: 'questions answered',
      elapsed: 'Elapsed time',
      saving: 'Saving...',
      saved: 'Saved',
      autoSave: 'Auto-save enabled',
      dataProtected: 'Your data is protected',
      longSessionWarning: 'Long session - All saved',
    },
  };

  const t = texts[language];

  // Actualizar tiempo transcurrido cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionStartTime > 0) {
        setElapsedTime(Date.now() - sessionStartTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Mostrar indicador de guardado cuando se guarda
  useEffect(() => {
    if (lastCheckpointTime) {
      setShowSavedIndicator(true);
      const timer = setTimeout(() => setShowSavedIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCheckpointTime]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Detectar si es una sesión larga (más de 15 minutos)
  const isLongSession = elapsedTime > 15 * 60 * 1000;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Contador de mensajes */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-md">
            {messageCount}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">{t.messages}</div>
            <div className="text-xs text-slate-500">{t.autoSave}</div>
          </div>
        </div>

        {/* Tiempo transcurrido */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm border ${
          isLongSession ? 'bg-amber-50 border-amber-200' : 'bg-white border-blue-100'
        }`}>
          <svg className={`w-5 h-5 ${isLongSession ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className={`text-xs ${isLongSession ? 'text-amber-600' : 'text-slate-500'}`}>{t.elapsed}</div>
            <div className={`text-lg font-bold tabular-nums ${isLongSession ? 'text-amber-700' : 'text-slate-800'}`}>
              {formatTime(elapsedTime)}
            </div>
          </div>
        </div>

        {/* Indicador de guardado mejorado */}
        <div className="flex items-center gap-2 min-w-[140px]">
          {isSaving ? (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium">{t.saving}</span>
            </div>
          ) : showSavedIndicator ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full animate-fade-in">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{t.saved}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium">{t.dataProtected}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje tranquilizador para sesiones largas */}
      {isLongSession && (
        <div className="mt-3 flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-2 rounded-lg text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {t.longSessionWarning} - {language === 'es'
              ? 'Puedes finalizar cuando quieras sin perder datos'
              : 'You can end whenever you want without losing data'}
          </span>
        </div>
      )}

      {/* Barra de progreso visual - ahora más sutil */}
      <div className={`mt-3 h-1.5 bg-white rounded-full overflow-hidden shadow-inner ${isLongSession ? 'bg-amber-100' : ''}`}>
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            isLongSession
              ? 'bg-gradient-to-r from-amber-400 to-amber-600'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}
          style={{ width: `${Math.min((messageCount / 20) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;
