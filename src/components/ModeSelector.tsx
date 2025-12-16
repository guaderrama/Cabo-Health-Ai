import React, { useRef, useEffect } from 'react';
import { type Language, type InterviewMode } from '../types';
import { UI_TEXTS } from '../constants';
import { MicrophoneIcon, KeyboardIcon } from './icons';

interface ModeSelectorProps {
  language: Language;
  onSelectMode: (mode: InterviewMode) => void;
  patientName: string;
  onPatientNameChange: (name: string) => void;
  onLanguageChange: (lang: Language) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({
  language,
  onSelectMode,
  patientName,
  onPatientNameChange,
  onLanguageChange,
}) => {
  const texts = UI_TEXTS[language];
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isNameMissing = !patientName.trim();

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const sanitizedName = name.replace(/[^a-zA-Z\u00C0-\u00FF\s'-]/g, '').slice(0, 100);
    onPatientNameChange(sanitizedName);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center h-full min-h-[500px] md:min-h-[600px] lg:min-h-0">
      {/* Logo removed - already in header, was causing overlap */}

      {/* Patient Name Input */}
      <div className="w-full max-w-sm mb-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <label htmlFor="patient-name-mode" className="block text-sm font-medium text-blue-700 mb-2 text-center">
          {language === 'es' ? 'Nombre del Paciente' : 'Patient Name'}
        </label>
        <input
          ref={nameInputRef}
          id="patient-name-mode"
          type="text"
          value={patientName}
          onChange={handleNameChange}
          placeholder={texts.fullNameLabel}
          className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg text-center bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-lg font-medium"
          aria-required="true"
          maxLength={100}
        />
      </div>

      {/* Mode Selection Title */}
      <h2 className="text-lg font-semibold text-slate-700 mb-6 text-center px-4">
        {texts.modeSelectionTitle}
      </h2>

      {/* Mode Selection Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg px-4">
        {/* Voice Mode Button */}
        <button
          onClick={() => onSelectMode('VOICE')}
          disabled={isNameMissing}
          className="flex-1 group relative bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed active:scale-[0.98]"
          aria-label={texts.modeVoiceTitle}
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
              <MicrophoneIcon className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold mb-1">{texts.modeVoiceTitle}</span>
            <span className="text-sm opacity-90">{texts.modeVoiceDesc}</span>
          </div>
        </button>

        {/* Text Mode Button */}
        <button
          onClick={() => onSelectMode('TEXT')}
          disabled={isNameMissing}
          className="flex-1 group relative bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed active:scale-[0.98]"
          aria-label={texts.modeTextTitle}
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
              <KeyboardIcon className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold mb-1">{texts.modeTextTitle}</span>
            <span className="text-sm opacity-90">{texts.modeTextDesc}</span>
          </div>
        </button>
      </div>

      {/* Helper text when name is missing */}
      {isNameMissing && (
        <p className="text-sm text-amber-600 mt-4 text-center">
          {language === 'es'
            ? 'Ingresa el nombre del paciente para continuar'
            : 'Enter patient name to continue'}
        </p>
      )}

      {/* Language Selector */}
      <div className="mt-8 flex space-x-4" role="radiogroup" aria-label={language === 'es' ? 'Seleccion de idioma' : 'Language selection'}>
        <button
          onClick={() => onLanguageChange('es')}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${language === 'es' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          role="radio"
          aria-checked={language === 'es'}
        >
          {texts?.spanish ?? 'Espanol'}
        </button>
        <button
          onClick={() => onLanguageChange('en')}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          role="radio"
          aria-checked={language === 'en'}
        >
          {texts?.english ?? 'English'}
        </button>
      </div>
    </div>
  );
};

export default React.memo(ModeSelector);
