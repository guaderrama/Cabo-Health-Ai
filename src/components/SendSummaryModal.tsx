import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { type Language } from '../types';
import { UI_TEXTS } from '../constants';
import { UserIcon, CalendarIcon, SendIcon, CheckIcon, XIcon } from './icons';

interface SendSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  language: Language;
  patientName: string;
  transcript: any[];
  sessionId: string;
  sessionDuration?: number;
}

type SubmissionState = 'FORM' | 'SENDING' | 'SUCCESS';

const SendSummaryModal: React.FC<SendSummaryModalProps> = ({ 
  isOpen, 
  onClose, 
  summary, 
  language, 
  patientName,
  transcript,
  sessionId,
  sessionDuration 
}) => {
  const texts = UI_TEXTS[language];
  const [submissionState, setSubmissionState] = useState<SubmissionState>('FORM');
  const [error, setError] = useState('');
  const [confirmationId, setConfirmationId] = useState('');
  const [formData, setFormData] = useState({
    fullName: patientName,
    dob: '',
    patientEmail: '',
    doctorEmail: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, fullName: patientName }));
    }
  }, [isOpen, patientName]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setSubmissionState('FORM');
      setError('');
      setFormData({ fullName: patientName, dob: '', patientEmail: '', doctorEmail: '' });
    }, 300);
  }, [onClose, patientName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.dob || !formData.patientEmail || !formData.doctorEmail) {
      setError(texts.formError);
      return;
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.patientEmail)) {
      setError(language === 'es' ? 'El correo del paciente no es válido.' : 'Patient email is invalid.');
      return;
    }
    if (!emailRegex.test(formData.doctorEmail)) {
      setError(language === 'es' ? 'El correo del médico no es válido.' : 'Doctor email is invalid.');
      return;
    }
    
    setSubmissionState('SENDING');

    try {
      // Verificar autenticación
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        throw new Error(language === 'es' 
          ? 'Debe iniciar sesión para guardar la consulta' 
          : 'You must be logged in to save the consultation');
      }

      // Guardar consulta completa en la base de datos
      const { data: saveData, error: saveError } = await supabase.functions.invoke('save-consultation', {
        body: {
          patientData: formData,
          sessionId: sessionId,
          language: language,
          transcriptions: transcript,
          summary: summary,
          sessionDuration: sessionDuration
        }
      });

      if (saveError) {
        throw new Error(saveError.message || 'Error al guardar la consulta');
      }

      const consultationId = saveData?.data?.consultationId;

      // Enviar email al médico
      const { error: emailError } = await supabase.functions.invoke('send-summary-email', {
        body: {
          summary: summary,
          doctorEmail: formData.doctorEmail,
          patientName: formData.fullName,
          consultationId: consultationId,
          language: language
        }
      });

      if (emailError) {
        console.warn('Error al enviar email:', emailError);
        // No fallar todo el proceso si solo falla el email
      }

      setConfirmationId((consultationId || sessionId).substring(0, 8).toUpperCase());
      setSubmissionState('SUCCESS');

    } catch (err) {
      console.error('Error al enviar resumen:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : (language === 'es' 
            ? 'Error al enviar el resumen. Por favor, intente de nuevo.' 
            : 'Error sending summary. Please try again.')
      );
      setSubmissionState('FORM');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;
  
  const today = new Date().toISOString().split('T')[0];

  const renderContent = () => {
    switch (submissionState) {
      case 'SENDING':
        return (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-lg font-semibold text-slate-700">{texts.sendingButton}</p>
          </div>
        );
      case 'SUCCESS':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
              <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mt-4">{texts.sentSuccessTitle}</h3>
            <p className="text-slate-600 mt-2">{texts.sentSuccessBody.replace('{doctorEmail}', formData.doctorEmail)}</p>
            <div className="mt-4 bg-slate-100 p-3 rounded-lg">
                <p className="text-sm text-slate-500">{texts.confirmationId}</p>
                <p className="text-lg font-mono font-semibold text-slate-800 tracking-widest">{confirmationId}</p>
            </div>
          </div>
        );
      case 'FORM':
      default:
        return (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">{texts.fullNameLabel}</label>
              <div className="mt-1 relative">
                <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="fullName" id="fullName" value={formData.fullName} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base" />
              </div>
            </div>
             <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-700">{texts.dobLabel}</label>
              <div className="mt-1 relative">
                <CalendarIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} required max={today} className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base" />
              </div>
            </div>
             <div>
              <label htmlFor="patientEmail" className="block text-sm font-medium text-slate-700">{texts.patientEmailLabel}</label>
              <input type="email" name="patientEmail" id="patientEmail" value={formData.patientEmail} onChange={handleChange} required placeholder="you@example.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base" />
            </div>
             <div>
              <label htmlFor="doctorEmail" className="block text-sm font-medium text-slate-700">{texts.doctorEmailLabel}</label>
              <input type="email" name="doctorEmail" id="doctorEmail" value={formData.doctorEmail} onChange={handleChange} required placeholder="doctor@clinic.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-base" />
            </div>
            {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
          </form>
        );
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up p-4"
        style={{ animationDuration: '0.3s' }}
        onClick={handleClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800">{texts.modalTitleSend}</h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-800 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto">
            {renderContent()}
        </main>
        <footer className="flex items-center justify-end p-4 border-t bg-slate-50 rounded-b-xl space-x-3 flex-shrink-0">
          {submissionState !== 'SUCCESS' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              {texts.closeButton}
            </button>
          )}
          {submissionState === 'FORM' && (
             <button
                type="submit"
                onClick={handleSubmit}
                className="w-40 h-10 flex items-center justify-center rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-md"
             >
                <SendIcon className="w-5 h-5 mr-2" />
                {texts.sendSummaryButton}
             </button>
          )}
           {submissionState === 'SUCCESS' && (
             <button
                onClick={handleClose}
                className="w-40 h-10 flex items-center justify-center rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-md"
             >
                {texts.doneButton}
             </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default SendSummaryModal;
