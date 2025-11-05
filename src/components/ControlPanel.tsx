import React, { useState, useEffect } from 'react';
import { type AppState, type Language } from '../types';
import { UI_TEXTS } from '../constants';
import ListeningVisualizer from './ListeningVisualizer';
import { MicrophoneIcon, StopIcon } from './icons';

interface ControlPanelProps {
  appState: AppState;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onStartSession: () => void;
  onEndSession: () => void;
  audioFrequency: number;
  error: string | null;
  patientName: string;
  onPatientNameChange: (name: string) => void;
  onOpenDiagnostic?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  appState,
  language,
  onLanguageChange,
  onStartSession,
  onEndSession,
  audioFrequency,
  error,
  patientName,
  onPatientNameChange,
  onOpenDiagnostic
}) => {
  const texts = UI_TEXTS[language];
  const isIdle = appState === 'IDLE';
  const isConnecting = appState === 'CONNECTING';
  const isListening = appState === 'LISTENING';
  const isProcessing = appState === 'PROCESSING';
  const isBusy = isConnecting || isProcessing;
  const isNameMissing = !patientName.trim();
  
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isListening && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }
    if (!isListening && sessionStartTime) {
      setSessionStartTime(null);
      setElapsed(0);
    }
  }, [isListening, sessionStartTime]);

  useEffect(() => {
    if (!sessionStartTime) return;
    
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const handleEndSessionClick = () => {
    const confirmMsg = language === 'es'
      ? '¿Finalizar la sesión? Esto generará el resumen clínico.'
      : 'End the session? This will generate the clinical summary.';
    if (window.confirm(confirmMsg)) {
      onEndSession();
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    // Basic validation: limit length and allow specific characters.
    const sanitizedName = name.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').slice(0, 100);
    onPatientNameChange(sanitizedName);
  };

  const getStatusText = () => {
    switch (appState) {
      case 'IDLE': return isNameMissing ? texts.enterFullName : texts.idle;
      case 'CONNECTING': return texts.connecting;
      case 'LISTENING': return texts.listening;
      case 'PROCESSING': return texts.processing;
      case 'COMPLETED': return texts.completed;
      case 'ERROR': return texts.error;
      default: return '';
    }
  };

  const ActionButton: React.FC = () => {
    if (isBusy) {
      return (
        <button
          className="w-28 h-28 rounded-full bg-slate-400 text-white flex flex-col items-center justify-center transition-all duration-300 shadow-lg cursor-not-allowed"
          disabled
        >
          <div className="w-8 h-8 border-4 border-white/50 border-t-white rounded-full animate-spin mb-2"></div>
          <span className="text-sm font-semibold">{isProcessing ? texts.processingButton : texts.connecting}</span>
        </button>
      );
    }

    if (isListening) {
      return (
        <button
          onClick={handleEndSessionClick}
          className="w-28 h-28 rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center transition-all duration-300 shadow-lg"
          aria-label={texts.endSession}
        >
          <StopIcon className="w-8 h-8 mb-1" />
          <span className="text-sm font-semibold">{texts.endSession}</span>
        </button>
      );
    }

    return (
      <button
        onClick={onStartSession}
        disabled={isNameMissing}
        className="w-28 h-28 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center transition-all duration-300 shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
        aria-label={texts.startSession}
      >
        <MicrophoneIcon className="w-8 h-8 mb-1" />
        <span className="text-sm font-semibold">{texts.startSession}</span>
      </button>
    );
  };
  
  const disableLangButtons = isConnecting || isListening || isProcessing;

  const MicLevelIndicator: React.FC = () => {
    const level = Math.min(audioFrequency / 100, 1); // Normalize to 0-1
    return (
        <div className="w-full max-w-xs h-2 bg-slate-200 rounded-full mt-2">
            <div 
                className="h-full bg-green-500 rounded-full transition-all duration-100"
                style={{ width: `${level * 100}%`}}
            />
        </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center h-full min-h-[500px] lg:min-h-0">
      <ListeningVisualizer isListening={isListening} audioFrequency={audioFrequency} />
      {isListening && <MicLevelIndicator />}

      <div className="mt-6 text-center h-12">
        <p className="text-slate-700 font-medium">{getStatusText()}</p>
        {isListening && (
          <p className="text-sm text-slate-500 font-mono mt-1" aria-live="off" aria-atomic="true">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </p>
        )}
      </div>

      {error && (
        <div className="text-center">
          <p className="text-red-600 text-sm mt-2">{error}</p>
          {(error.includes('micrófono') || error.includes('microphone')) && onOpenDiagnostic && (
            <button
              onClick={onOpenDiagnostic}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {language === 'es' ? 'Ejecutar diagnóstico del micrófono' : 'Run microphone diagnostic'}
            </button>
          )}
        </div>
      )}
      
      {isIdle && (
        <div className="w-full max-w-sm my-6">
           <label htmlFor="patient-name" className="sr-only">{texts.fullNameLabel}</label>
           <input
             id="patient-name"
             type="text"
             value={patientName}
             onChange={handleNameChange}
             placeholder={texts.fullNameLabel}
             className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
             aria-required="true"
             maxLength={100}
           />
        </div>
      )}

      {!isIdle && <div className="my-6 h-[58px]"></div>}

      <div className="my-2 flex space-x-4">
        <button
          onClick={() => onLanguageChange('es')}
          disabled={disableLangButtons}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            language === 'es' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {texts.spanish}
        </button>
        <button
          onClick={() => onLanguageChange('en')}
          disabled={disableLangButtons}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            language === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {texts.english}
        </button>
      </div>
      
      <div className="mt-6">
        <ActionButton />
      </div>
    </div>
  );
};

export default React.memo(ControlPanel);
