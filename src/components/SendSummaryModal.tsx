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
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, fullName: patientName }));
    }
  }, [isOpen, patientName]);

  // Scroll lock - Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setSubmissionState('FORM');
      setError('');
      setFormData({ fullName: patientName, dob: '' });
    }, 300);
  }, [onClose, patientName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('📝 [DEBUG] Iniciando guardado de consulta...');
    console.log('   Transcript length:', transcript.length);
    console.log('   Summary length:', summary?.length || 0);
    console.log('   Form data:', formData);

    // Validar que la consulta tenga datos significativos
    if (transcript.length < 2) {
      console.error('❌ [DEBUG] Validación fallida: transcript < 2 mensajes');
      setError(language === 'es'
        ? 'La consulta debe tener al menos 2 mensajes para ser guardada.\n\n📋 Pasos:\n1. Continúa hablando con Nova\n2. Responde las preguntas del cuestionario\n3. Espera a completar al menos 2 intercambios'
        : 'The consultation must have at least 2 messages to be saved.\n\n📋 Steps:\n1. Continue talking with Nova\n2. Answer the questionnaire questions\n3. Wait to complete at least 2 exchanges');
      return;
    }

    // Validar que los mensajes tengan contenido real (no solo saludos)
    const totalWordCount = transcript.reduce((sum, msg) => sum + msg.text.split(' ').filter(w => w.length > 0).length, 0);
    if (totalWordCount < 50) {
      console.error('❌ [DEBUG] Validación fallida: contenido muy breve (<50 palabras)');
      setError(language === 'es'
        ? 'La conversación es muy breve para generar un resumen clínico útil.\n\n📋 Pasos:\n1. Continúa la conversación con Nova\n2. Proporciona más detalles sobre tus síntomas\n3. Responde las preguntas de seguimiento\n\nPalabras actuales: ' + totalWordCount + ' / 50 mínimo'
        : 'The conversation is too brief to generate a useful clinical summary.\n\n📋 Steps:\n1. Continue the conversation with Nova\n2. Provide more details about your symptoms\n3. Answer follow-up questions\n\nCurrent words: ' + totalWordCount + ' / 50 minimum');
      return;
    }

    // Validar que Nova haya respondido (no solo el paciente hablando)
    const novaMessageCount = transcript.filter(msg => msg.sender === 'Nova' || msg.sender === 'model').length;
    if (novaMessageCount < 1) {
      console.error('❌ [DEBUG] Validación fallida: Nova no ha respondido');
      setError(language === 'es'
        ? 'Esperando respuesta de Nova.\n\n📋 Pasos:\n1. Asegúrate de que Nova haya respondido\n2. Si no responde, verifica tu conexión a internet\n3. Espera unos segundos y vuelve a intentar'
        : 'Waiting for Nova response.\n\n📋 Steps:\n1. Make sure Nova has responded\n2. If not responding, check your internet connection\n3. Wait a few seconds and try again');
      return;
    }

    if (!summary || summary.trim().length < 50) {
      console.error('❌ [DEBUG] Validación fallida: summary muy corto o vacío');
      console.error('   Summary actual:', summary?.substring(0, 100));
      setError(language === 'es'
        ? 'El resumen es demasiado corto o está vacío.\n\n📋 Pasos:\n1. Completa la conversación con Nova\n2. Espera a que Nova genere el resumen\n3. Si el error persiste, finaliza la sesión nuevamente'
        : 'The summary is too short or empty.\n\n📋 Steps:\n1. Complete the conversation with Nova\n2. Wait for Nova to generate the summary\n3. If the error persists, end the session again');
      return;
    }

    // Validar datos del formulario
    if (!formData.fullName || !formData.dob) {
      console.error('❌ [DEBUG] Validación fallida: datos del formulario incompletos');
      setError(language === 'es'
        ? 'Por favor completa todos los campos del formulario.\n\n📋 Campos requeridos:\n✓ Nombre completo del paciente\n✓ Fecha de nacimiento'
        : 'Please complete all form fields.\n\n📋 Required fields:\n✓ Patient full name\n✓ Date of birth');
      return;
    }

    // Validar formato de nombre (al menos 2 palabras)
    const nameParts = formData.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      console.error('❌ [DEBUG] Validación fallida: nombre incompleto');
      setError(language === 'es'
        ? 'Por favor ingresa el nombre completo del paciente (nombre y apellido).\n\nEjemplo: Juan Pérez'
        : 'Please enter the patient\'s full name (first and last name).\n\nExample: John Doe');
      return;
    }

    // Validar fecha de nacimiento no sea futura
    const dobDate = new Date(formData.dob);
    if (dobDate > new Date()) {
      console.error('❌ [DEBUG] Validación fallida: fecha de nacimiento futura');
      setError(language === 'es'
        ? 'La fecha de nacimiento no puede ser en el futuro.'
        : 'The date of birth cannot be in the future.');
      return;
    }

    console.log('✅ [DEBUG] Todas las validaciones pasaron');
    setSubmissionState('SENDING');

    try {
      // Verificar autenticación
      console.log('🔐 [DEBUG] Verificando autenticación...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session) {
        console.error('❌ [DEBUG] Error de autenticación:', authError || 'No hay sesión activa');
        throw new Error(language === 'es'
          ? 'Debe iniciar sesión para guardar la consulta'
          : 'You must be logged in to save the consultation');
      }

      console.log('✅ [DEBUG] Sesión autenticada:', {
        userId: session.user.id,
        email: session.user.email
      });

      // Calcular motivation score del resumen
      const motivationMatch = summary.match(/Readiness general:\s*\[?(\d+(?:\.\d+)?)/);
      const motivationScore = motivationMatch ? parseFloat(motivationMatch[1]) : 5.0;

      console.log('💾 [DEBUG] Preparando datos para guardar...');
      const dataToInsert = {
        user_id: session.user.id,
        session_id: sessionId,
        patient_name: formData.fullName,
        patient_dob: formData.dob,
        patient_email: null,
        language: language,
        transcript: transcript,
        summary: summary,
        motivation_score: motivationScore,
        session_duration: sessionDuration || 0,
        message_count: transcript.length,
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      console.log('📤 [DEBUG] Enviando a Supabase:', {
        user_id: dataToInsert.user_id,
        session_id: dataToInsert.session_id,
        patient_name: dataToInsert.patient_name,
        message_count: dataToInsert.message_count
      });

      // Guardar directamente en consultations (estructura simplificada)
      const { data: consultationData, error: saveError } = await supabase
        .from('consultations')
        .insert([dataToInsert])
        .select()
        .single();

      if (saveError) {
        console.error('❌ [DEBUG] Error al guardar en Supabase:', saveError);
        console.error('   Código:', saveError.code);
        console.error('   Mensaje:', saveError.message);
        console.error('   Detalles:', saveError.details);
        throw new Error(saveError.message || (language === 'es' ? 'Error al guardar la consulta' : 'Error saving consultation'));
      }

      console.log('✅ [DEBUG] Consulta guardada exitosamente!', {
        id: consultationData?.id,
        patient_name: consultationData?.patient_name
      });

      const consultationId = consultationData?.id;
      setConfirmationId((consultationId || sessionId).substring(0, 8).toUpperCase());
      setSubmissionState('SUCCESS');

    } catch (err) {
      console.error('❌ [DEBUG] Error en el flujo de guardado:', err);
      console.error('   Tipo:', err instanceof Error ? 'Error' : typeof err);
      console.error('   Stack:', err instanceof Error ? err.stack : 'N/A');

      // Detectar tipo de error y proporcionar mensaje específico
      let errorMessage = '';

      if (err instanceof Error) {
        const errorText = err.message.toLowerCase();

        // Error de autenticación
        if (errorText.includes('auth') || errorText.includes('login') || errorText.includes('session')) {
          errorMessage = language === 'es'
            ? 'Error de autenticación.\n\n📋 Pasos:\n1. Cierra sesión en el menú superior\n2. Vuelve a iniciar sesión\n3. Intenta guardar nuevamente\n\nSi el problema persiste, recarga la página.'
            : 'Authentication error.\n\n📋 Steps:\n1. Log out from the top menu\n2. Log in again\n3. Try saving again\n\nIf the problem persists, reload the page.';
        }
        // Error de permisos RLS
        else if (errorText.includes('rls') || errorText.includes('policy') || errorText.includes('permission')) {
          errorMessage = language === 'es'
            ? 'Error de permisos en la base de datos.\n\n📋 Pasos:\n1. Verifica que iniciaste sesión correctamente\n2. Cierra sesión y vuelve a iniciar\n3. Contacta al administrador si persiste\n\nCódigo técnico: RLS Policy Violation'
            : 'Database permissions error.\n\n📋 Steps:\n1. Verify you are logged in correctly\n2. Log out and log in again\n3. Contact administrator if it persists\n\nTechnical code: RLS Policy Violation';
        }
        // Error de red
        else if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('timeout')) {
          errorMessage = language === 'es'
            ? 'Error de conexión a internet.\n\n📋 Pasos:\n1. Verifica tu conexión a internet\n2. Recarga la página\n3. Intenta guardar nuevamente\n\nTus datos NO se han perdido, están en memoria.'
            : 'Internet connection error.\n\n📋 Steps:\n1. Check your internet connection\n2. Reload the page\n3. Try saving again\n\nYour data is NOT lost, it is in memory.';
        }
        // Error genérico con mensaje original
        else {
          errorMessage = err.message + '\n\n📋 ' + (language === 'es'
            ? 'Pasos:\n1. Intenta nuevamente en unos segundos\n2. Si persiste, recarga la página\n3. Contacta soporte si el problema continúa'
            : 'Steps:\n1. Try again in a few seconds\n2. If it persists, reload the page\n3. Contact support if the problem continues');
        }
      } else {
        errorMessage = language === 'es'
          ? 'Error desconocido al guardar.\n\n📋 Pasos:\n1. Recarga la página\n2. Vuelve a intentar\n3. Si persiste, contacta soporte técnico'
          : 'Unknown error while saving.\n\n📋 Steps:\n1. Reload the page\n2. Try again\n3. If it persists, contact technical support';
      }

      setError(errorMessage);
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
          <div className="flex flex-col items-center justify-center h-48" role="status" aria-live="polite">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin" aria-hidden="true"></div>
            <p className="mt-4 text-lg font-semibold text-slate-700">{texts.sendingButton}</p>
          </div>
        );
      case 'SUCCESS':
        return (
          <div className="text-center" role="status" aria-live="polite">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center" aria-hidden="true">
              <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mt-4">
              {language === 'es' ? '¡Consulta Guardada!' : 'Consultation Saved!'}
            </h3>
            <p className="text-slate-600 mt-2">
              {language === 'es'
                ? 'La consulta se guardó exitosamente. Los médicos pueden verla en su dashboard.'
                : 'The consultation was saved successfully. Doctors can view it in their dashboard.'}
            </p>
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
            {error && (
              <div role="alert" aria-live="assertive" className="text-sm text-red-600 text-center pt-2">
                <p>{error}</p>
              </div>
            )}
          </form>
        );
    }
  };

  return (
    <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up p-4"
        style={{ animationDuration: '0.3s' }}
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-summary-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 id="send-summary-title" className="text-xl font-bold text-slate-800">{texts.modalTitleSend}</h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-800 transition-colors"
            aria-label={language === 'es' ? 'Cerrar modal' : 'Close modal'}
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6 overflow-y-auto" id="send-summary-content">
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
          {(submissionState === 'FORM' || submissionState === 'SENDING') && (
             <button
                type="submit"
                onClick={handleSubmit}
                disabled={submissionState === 'SENDING'}
                className="w-40 h-10 flex items-center justify-center rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
