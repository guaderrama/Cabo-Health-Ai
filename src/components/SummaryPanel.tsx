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
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-600">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-bold text-slate-800">{texts.summaryProcessingTitle}</h3>
            <p>{texts.summaryProcessingBody}</p>
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
