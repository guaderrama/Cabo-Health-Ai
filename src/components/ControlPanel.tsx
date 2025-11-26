import React, { useState, useEffect, useRef } from 'react';
import { type AppState, type Language } from '../types';
import { UI_TEXTS } from '../constants';
import ListeningVisualizer from './ListeningVisualizer';
import { MicrophoneIcon, StopIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';

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
  onRetry?: () => void;
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
  onOpenDiagnostic,
  onRetry
}) => {
  const texts = UI_TEXTS[language];
  const isIdle = appState === 'IDLE';
  const isConnecting = appState === 'CONNECTING';
  const isListening = appState === 'LISTENING';
  const isProcessing = appState === 'PROCESSING';
  const isBusy = isConnecting || isProcessing;
  const isNameMissing = !patientName.trim();

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  // Auto-focus en campo de nombre cuando está en IDLE
  useEffect(() => {
    if (isIdle && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isIdle]);

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
    setShowEndConfirmation(true);
  };

  const handleConfirmEnd = () => {
    setShowEndConfirmation(false);
    onEndSession();
  };

  const handleCancelEnd = () => {
    setShowEndConfirmation(false);
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
        <div className="flex flex-col items-center">
          <button
            className="w-28 h-28 rounded-full bg-slate-400 text-white flex flex-col items-center justify-center transition-all duration-300 shadow-lg cursor-not-allowed"
            disabled
            aria-busy="true"
            title={isProcessing
              ? (language === 'es' ? 'Procesando conversación...' : 'Processing conversation...')
              : (language === 'es' ? 'Conectando con el servidor...' : 'Connecting to server...')
            }
          >
            <div className="w-8 h-8 border-4 border-white/50 border-t-white rounded-full animate-spin mb-2"></div>
            <span className="text-sm font-semibold">{isProcessing ? texts.processingButton : texts.connecting}</span>
          </button>
          {isConnecting && (
            <p className="text-xs text-slate-500 mt-3 max-w-xs text-center">
              {language === 'es'
                ? 'Si tu navegador solicita permisos, por favor acéptalos para continuar'
                : 'If your browser requests permissions, please accept them to continue'}
            </p>
          )}
        </div>
      );
    }

    if (isListening) {
      return (
        <button
          onClick={handleEndSessionClick}
          className="w-28 h-28 rounded-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center transition-all duration-300 shadow-lg active:scale-95"
          aria-label={texts.endSession}
          title={language === 'es'
            ? 'Finalizar la sesión y generar resumen clínico'
            : 'End session and generate clinical summary'}
        >
          <StopIcon className="w-8 h-8 mb-1" />
          <span className="text-sm font-semibold">{texts.endSession}</span>
        </button>
      );
    }

    return (
      <button
        onClick={onStartSession}
        disabled={isNameMissing || isBusy}
        className="w-28 h-28 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center transition-all duration-300 shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed active:scale-95"
        aria-label={texts.startSession}
        title={isNameMissing
          ? (language === 'es' ? 'Ingresa el nombre del paciente para comenzar' : 'Enter patient name to start')
          : (language === 'es' ? 'Iniciar conversación con Nova' : 'Start conversation with Nova')
        }
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
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center h-full min-h-[500px] md:min-h-[600px] lg:min-h-0">
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
        <div className="text-center max-w-md">
          <p className="text-red-600 text-sm mt-2">{error}</p>
          <div className="flex flex-col gap-2 mt-3">
            {(error.includes('micrófono') || error.includes('microphone')) && onOpenDiagnostic && (
              <button
                onClick={onOpenDiagnostic}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                title={language === 'es'
                  ? 'Verificar permisos y funcionamiento del micrófono'
                  : 'Check microphone permissions and functionality'}
              >
                {language === 'es' ? 'Ejecutar diagnóstico del micrófono' : 'Run microphone diagnostic'}
              </button>
            )}
            {appState === 'ERROR' && onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors active:scale-95"
                title={language === 'es'
                  ? 'Intentar conectar nuevamente con el servidor'
                  : 'Attempt to reconnect to the server'}
              >
                {language === 'es' ? 'Reintentar Conexión' : 'Retry Connection'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {isIdle && (
        <div className="w-full max-w-sm my-6">
           <label htmlFor="patient-name" className="sr-only">{texts.fullNameLabel}</label>
           <input
             ref={nameInputRef}
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

      {!isIdle && patientName && (
        <div className="my-6 h-[58px] flex items-center justify-center">
          <div className="bg-blue-50 border border-blue-200 px-6 py-3 rounded-xl flex items-center gap-3 shadow-sm">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                {language === 'es' ? 'Paciente' : 'Patient'}
              </p>
              <p className="text-sm font-bold text-blue-900">
                {patientName}
              </p>
            </div>
          </div>
        </div>
      )}
      {!isIdle && !patientName && <div className="my-6 h-[58px]"></div>}

      <div className="my-2 flex space-x-4">
        <button
          onClick={() => onLanguageChange('es')}
          disabled={disableLangButtons}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            language === 'es' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={language === 'es' ? 'Idioma Español (actual)' : 'Change to Spanish'}
        >
          {texts.spanish}
        </button>
        <button
          onClick={() => onLanguageChange('en')}
          disabled={disableLangButtons}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            language === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={language === 'es' ? 'Cambiar a Inglés' : 'English Language (current)'}
        >
          {texts.english}
        </button>
      </div>
      
      <div className="mt-6">
        <ActionButton />
      </div>

      {/* Modal de confirmación para finalizar sesión */}
      <ConfirmationModal
        isOpen={showEndConfirmation}
        title={language === 'es' ? '¿Finalizar Sesión?' : 'End Session?'}
        message={language === 'es'
          ? 'Al finalizar la sesión, Nova generará el resumen clínico completo basado en la conversación. Podrás revisarlo y enviarlo al médico.'
          : 'When you end the session, Nova will generate a complete clinical summary based on the conversation. You will be able to review it and send it to the doctor.'}
        confirmText={language === 'es' ? 'Finalizar Sesión' : 'End Session'}
        cancelText={language === 'es' ? 'Continuar Conversación' : 'Continue Conversation'}
        onConfirm={handleConfirmEnd}
        onCancel={handleCancelEnd}
        language={language}
        isDangerous={false}
      />
    </div>
  );
};

export default React.memo(ControlPanel);
