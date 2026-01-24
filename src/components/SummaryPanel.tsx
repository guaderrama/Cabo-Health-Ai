import React, { useState, useEffect } from 'react';
import { type AppState, type Language, type TranscriptMessage } from '../types';
import { UI_TEXTS } from '../constants';
import { CheckIcon, SendIcon } from './icons';
import SendSummaryModal from './SendSummaryModal';

interface SummaryPanelProps {
  summary: string;
  appState: AppState;
  language: Language;
  patientName: string;
  onNewSession: () => void;
  transcript: TranscriptMessage[];
  sessionId: string;
  sessionDuration: number;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ 
  summary, 
  appState, 
  language, 
  patientName, 
  onNewSession,
  transcript,
  sessionId,
  sessionDuration
}) => {
  const texts = UI_TEXTS[language];
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Ensure modal is closed when a new session starts
    if (appState !== 'COMPLETED') {
      setIsModalOpen(false);
    }
  }, [appState]);

  const handleNewSessionClick = () => {
    const confirmMsg = language === 'es'
      ? '¿Está seguro de que desea iniciar una nueva sesión? El resumen y la transcripción actuales se perderán.'
      : 'Are you sure you want to start a new session? The current summary and transcript will be lost.';
    if (window.confirm(confirmMsg)) {
      onNewSession();
    }
  };

  const renderContent = () => {
    switch (appState) {
      case 'PROCESSING':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-600 px-4">
            {/* Success badge - Interview saved */}
            <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-700">
                {language === 'es' ? 'Entrevista guardada' : 'Interview saved'}
              </span>
            </div>

            {/* Animated brain/AI icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              {/* Pulsing ring animation */}
              <div className="absolute inset-0 w-20 h-20 bg-blue-400 rounded-full animate-ping opacity-20"></div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">{texts.summaryProcessingTitle}</h3>
            <p className="text-slate-600 mb-4">{texts.summaryProcessingBody}</p>

            {/* Animated progress bar */}
            <div className="w-full max-w-xs mb-4">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 rounded-full animate-shimmer w-full">
                </div>
              </div>
            </div>

            {/* Time estimate message */}
            <p className="text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-lg">
              {language === 'es'
                ? '⏱️ Generando con Gemini 3 Flash (30-60 segundos)...'
                : '⏱️ Generating with Gemini 3 Flash (30-60 seconds)...'}
            </p>

            {/* Reassurance message */}
            <p className="text-xs text-slate-400 mt-3 max-w-xs">
              {language === 'es'
                ? 'Tus datos están seguros. Puedes cerrar esta página y volver más tarde.'
                : 'Your data is safe. You can close this page and come back later.'}
            </p>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-600">
             <CheckIcon className="w-16 h-16 text-green-500 mb-4" />
             <h3 className="text-lg font-bold text-slate-800">{texts.summaryReadyTitle}</h3>
             <p className="mb-6">{texts.summaryReadyBody}</p>
             <button
                onClick={() => setIsModalOpen(true)}
                className="w-48 h-12 flex items-center justify-center rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-md"
             >
                <SendIcon className="w-5 h-5 mr-2" />
                {texts.sendToDoctorButton}
             </button>
             <button
                onClick={handleNewSessionClick}
                className="mt-4 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
             >
                {language === 'es' ? 'Iniciar Nueva Sesión' : 'Start New Session'}
             </button>
          </div>
        );
      case 'IDLE':
      case 'LISTENING':
      case 'ERROR':
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>{texts.summaryPlaceholder}</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col h-[400px] md:h-[500px] lg:h-full">
        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b">
          {language === 'es' ? 'Resumen de la Consulta' : 'Consultation Summary'}
        </h2>
        <div className="flex-grow overflow-y-auto pr-2">
          {renderContent()}
        </div>
      </div>
      <SendSummaryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summary={summary}
        language={language}
        patientName={patientName}
        transcript={transcript}
        sessionId={sessionId}
        sessionDuration={sessionDuration}
      />
    </>
  );
};

export default React.memo(SummaryPanel);
