import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { type Language, type TranscriptMessage } from '../types';
import { UI_TEXTS } from '../constants';
import { UserIcon, CalendarIcon, SendIcon, CheckIcon, XIcon } from './icons';
import { logger } from '../lib/logger';
import { useFocusTrap } from '../hooks/useFocusTrap';

// Key para respaldo local de consultas pendientes
const PENDING_CONSULTATION_KEY = 'cabo_health_pending_consultation';

// Guardar consulta pendiente en localStorage como respaldo
const savePendingConsultation = (data: Record<string, unknown>) => {
  try {
    localStorage.setItem(PENDING_CONSULTATION_KEY, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString()
    }));
    logger.debug('💾 Consulta respaldada en localStorage');
  } catch (e) {
    logger.error('Error al respaldar en localStorage:', e);
  }
};

// Limpiar consulta pendiente después de éxito
const clearPendingConsultation = () => {
  try {
    localStorage.removeItem(PENDING_CONSULTATION_KEY);
    logger.debug('🗑️ Respaldo local eliminado (guardado exitoso)');
  } catch (e) {
    logger.error('Error al limpiar localStorage:', e);
  }
};

// Obtener consulta pendiente (para recuperación)
export const getPendingConsultation = (): Record<string, unknown> | null => {
  try {
    const data = localStorage.getItem(PENDING_CONSULTATION_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      logger.debug('📂 Consulta pendiente encontrada:', { sessionId: parsed.session_id });
      return parsed;
    }
  } catch (e) {
    logger.error('Error al leer localStorage:', e);
  }
  return null;
};

interface SendSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  language: Language;
  patientName: string;
  transcript: TranscriptMessage[];
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
  const focusTrapRef = useFocusTrap(isOpen);
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
    return undefined;
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

    logger.debug('📝 Iniciando guardado de consulta...', {
      transcriptLength: transcript.length,
      summaryLength: summary?.length || 0,
      formData
    });

    // Validar que la consulta tenga datos significativos
    if (transcript.length < 2) {
      logger.debug('Validación fallida: transcript < 2 mensajes');
      setError(language === 'es'
        ? 'La consulta debe tener al menos 2 mensajes para ser guardada.\n\n📋 Pasos:\n1. Continúa hablando con Nova\n2. Responde las preguntas del cuestionario\n3. Espera a completar al menos 2 intercambios'
        : 'The consultation must have at least 2 messages to be saved.\n\n📋 Steps:\n1. Continue talking with Nova\n2. Answer the questionnaire questions\n3. Wait to complete at least 2 exchanges');
      return;
    }

    // Validar que los mensajes tengan contenido real (no solo saludos)
    const totalWordCount = transcript.reduce((sum, msg) => sum + (msg?.text || '').split(' ').filter((w: string) => w.length > 0).length, 0);
    if (totalWordCount < 50) {
      logger.debug('Validación fallida: contenido muy breve (<50 palabras)');
      setError(language === 'es'
        ? 'La conversación es muy breve para generar un resumen clínico útil.\n\n📋 Pasos:\n1. Continúa la conversación con Nova\n2. Proporciona más detalles sobre tus síntomas\n3. Responde las preguntas de seguimiento\n\nPalabras actuales: ' + totalWordCount + ' / 50 mínimo'
        : 'The conversation is too brief to generate a useful clinical summary.\n\n📋 Steps:\n1. Continue the conversation with Nova\n2. Provide more details about your symptoms\n3. Answer follow-up questions\n\nCurrent words: ' + totalWordCount + ' / 50 minimum');
      return;
    }

    // Validar que Nova haya respondido (no solo el paciente hablando)
    const novaMessageCount = transcript.filter(msg => msg.sender === 'Nova' || msg.sender === 'model').length;
    if (novaMessageCount < 1) {
      logger.debug('Validación fallida: Nova no ha respondido');
      setError(language === 'es'
        ? 'Esperando respuesta de Nova.\n\n📋 Pasos:\n1. Asegúrate de que Nova haya respondido\n2. Si no responde, verifica tu conexión a internet\n3. Espera unos segundos y vuelve a intentar'
        : 'Waiting for Nova response.\n\n📋 Steps:\n1. Make sure Nova has responded\n2. If not responding, check your internet connection\n3. Wait a few seconds and try again');
      return;
    }

    if (!summary || summary.trim().length < 50) {
      logger.debug('Validación fallida: summary muy corto o vacío', summary?.substring(0, 100));
      setError(language === 'es'
        ? 'El resumen es demasiado corto o está vacío.\n\n📋 Pasos:\n1. Completa la conversación con Nova\n2. Espera a que Nova genere el resumen\n3. Si el error persiste, finaliza la sesión nuevamente'
        : 'The summary is too short or empty.\n\n📋 Steps:\n1. Complete the conversation with Nova\n2. Wait for Nova to generate the summary\n3. If the error persists, end the session again');
      return;
    }

    // Validar datos del formulario
    if (!formData.fullName || !formData.dob) {
      logger.debug('Validación fallida: datos del formulario incompletos');
      setError(language === 'es'
        ? 'Por favor completa todos los campos del formulario.\n\n📋 Campos requeridos:\n✓ Nombre completo del paciente\n✓ Fecha de nacimiento'
        : 'Please complete all form fields.\n\n📋 Required fields:\n✓ Patient full name\n✓ Date of birth');
      return;
    }

    // Validar formato de nombre (al menos 2 palabras)
    const nameParts = formData.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      logger.debug('Validación fallida: nombre incompleto');
      setError(language === 'es'
        ? 'Por favor ingresa el nombre completo del paciente (nombre y apellido).\n\nEjemplo: Juan Pérez'
        : 'Please enter the patient\'s full name (first and last name).\n\nExample: John Doe');
      return;
    }

    // Validar fecha de nacimiento no sea futura
    const dobDate = new Date(formData.dob);
    if (dobDate > new Date()) {
      logger.debug('Validación fallida: fecha de nacimiento futura');
      setError(language === 'es'
        ? 'La fecha de nacimiento no puede ser en el futuro.'
        : 'The date of birth cannot be in the future.');
      return;
    }

    logger.debug('✅ Todas las validaciones pasaron');
    setSubmissionState('SENDING');

    try {
      // Verificar autenticación
      logger.debug('🔐 Verificando autenticación...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session) {
        logger.debug('Error de autenticación:', authError || 'No hay sesión activa');
        throw new Error(language === 'es'
          ? 'Debe iniciar sesión para guardar la consulta'
          : 'You must be logged in to save the consultation');
      }

      logger.debug('✅ Sesión autenticada:', { userId: session.user.id, email: session.user.email });

      // Calcular motivation score del resumen (con múltiples patrones de fallback)
      const extractScore = (text: string, patterns: RegExp[]): number | null => {
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match?.[1]) {
            const score = parseFloat(match[1]);
            if (!isNaN(score)) return score;
          }
        }
        return null;
      };

      // Patrones para Readiness/Motivación general
      const readinessPatterns = [
        /Readiness\s*general[:\s]+\[?(\d+(?:\.\d+)?)/i,
        /Readiness[:\s]+\[?(\d+(?:\.\d+)?)\s*\/\s*10/i,
        /Motivación\s*general[:\s]+\[?(\d+(?:\.\d+)?)/i
      ];

      // Patrones para Importancia
      const importancePatterns = [
        /Importancia\s*del\s*cambio[:\s]+\[?(\d+(?:\.\d+)?)/i,
        /Importancia[:\s]+\[?(\d+(?:\.\d+)?)\s*\/\s*10/i
      ];

      // Patrones para Confianza (usamos como proxy de empathy)
      const confidencePatterns = [
        /Confianza\s*en\s*cambiar[:\s]+\[?(\d+(?:\.\d+)?)/i,
        /Confianza[:\s]+\[?(\d+(?:\.\d+)?)\s*\/\s*10/i
      ];

      const readinessScore = extractScore(summary, readinessPatterns);
      const importanceScore = extractScore(summary, importancePatterns);
      const confidenceScore = extractScore(summary, confidencePatterns);

      // Motivation score: promedio de readiness e importancia, o solo readiness
      const motivationScore = readinessScore !== null
        ? (importanceScore !== null ? (readinessScore + importanceScore) / 2 : readinessScore)
        : 5.0;

      // Empathy score: usamos confianza como proxy (refleja rapport con el paciente)
      const empathyScore = confidenceScore;

      logger.debug('💾 Preparando datos para guardar...', {
        motivationScore,
        empathyScore,
        readinessScore,
        importanceScore,
        confidenceScore
      });
      const dataToInsert = {
        user_id: session.user.id,
        session_id: sessionId,
        patient_name: formData.fullName,
        patient_dob: formData.dob,
        patient_email: session.user.email || null,
        language: language,
        transcript: transcript,
        summary: summary,
        motivation_score: motivationScore,
        empathy_score: empathyScore,
        session_duration: sessionDuration || 0,
        message_count: transcript.length,
        status: 'completed',
        completed_at: new Date().toISOString()
      };

      logger.debug('📤 Enviando a Supabase:', {
        user_id: dataToInsert.user_id,
        session_id: dataToInsert.session_id,
        patient_name: dataToInsert.patient_name,
        message_count: dataToInsert.message_count
      });

      // 🔒 RESPALDO: Guardar en localStorage ANTES de intentar Supabase
      // Si Supabase falla, los datos no se perderán
      savePendingConsultation(dataToInsert);

      // Guardar directamente en consultations (estructura simplificada)
      const { data: consultationData, error: saveError } = await supabase
        .from('consultations')
        .insert([dataToInsert])
        .select()
        .single();

      if (saveError) {
        logger.error('Error al guardar en Supabase:', saveError);
        throw new Error(saveError.message || (language === 'es' ? 'Error al guardar la consulta' : 'Error saving consultation'));
      }

      logger.debug('✅ Consulta guardada exitosamente!', {
        id: consultationData?.id,
        patient_name: consultationData?.patient_name
      });

      // 🗑️ Limpiar respaldo local - ya no es necesario
      clearPendingConsultation();

      // 🗑️ Limpiar pending_summaries - ya no es necesario
      try {
        await supabase
          .from('pending_summaries')
          .delete()
          .eq('session_id', sessionId);
      } catch (cleanupErr) {
        logger.warn('⚠️ Failed to cleanup pending_summaries:', cleanupErr);
      }

      const consultationId = consultationData?.id;
      setConfirmationId((consultationId || sessionId).substring(0, 8).toUpperCase());
      setSubmissionState('SUCCESS');

    } catch (err) {
      logger.error('Error en el flujo de guardado:', err);

      // Detectar tipo de error y proporcionar mensaje específico
      let errorMessage = '';

      if (err instanceof Error) {
        const errorText = err.message.toLowerCase();

        // Error de autenticación
        if (errorText.includes('auth') || errorText.includes('login') || errorText.includes('session')) {
          errorMessage = language === 'es'
            ? 'Error de autenticación.\n\n📋 Pasos:\n1. Cierra sesión en el menú superior\n2. Vuelve a iniciar sesión\n3. Intenta guardar nuevamente\n\n✅ Tus datos están respaldados localmente.'
            : 'Authentication error.\n\n📋 Steps:\n1. Log out from the top menu\n2. Log in again\n3. Try saving again\n\n✅ Your data is backed up locally.';
        }
        // Error de permisos RLS
        else if (errorText.includes('rls') || errorText.includes('policy') || errorText.includes('permission')) {
          errorMessage = language === 'es'
            ? 'Error de permisos en la base de datos.\n\n📋 Pasos:\n1. Verifica que iniciaste sesión correctamente\n2. Cierra sesión y vuelve a iniciar\n3. Contacta al administrador si persiste\n\n✅ Tus datos están respaldados localmente.'
            : 'Database permissions error.\n\n📋 Steps:\n1. Verify you are logged in correctly\n2. Log out and log in again\n3. Contact administrator if it persists\n\n✅ Your data is backed up locally.';
        }
        // Error de red
        else if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('timeout')) {
          errorMessage = language === 'es'
            ? 'Error de conexión a internet.\n\n📋 Pasos:\n1. Verifica tu conexión a internet\n2. Haz clic en "Enviar" nuevamente\n\n✅ Tus datos están respaldados localmente y no se perderán.'
            : 'Internet connection error.\n\n📋 Steps:\n1. Check your internet connection\n2. Click "Send" again\n\n✅ Your data is backed up locally and will not be lost.';
        }
        // Error genérico con mensaje original
        else {
          errorMessage = err.message + '\n\n📋 ' + (language === 'es'
            ? 'Pasos:\n1. Intenta nuevamente en unos segundos\n2. Si persiste, recarga la página\n\n✅ Tus datos están respaldados localmente.'
            : 'Steps:\n1. Try again in a few seconds\n2. If it persists, reload the page\n\n✅ Your data is backed up locally.');
        }
      } else {
        errorMessage = language === 'es'
          ? 'Error desconocido al guardar.\n\n📋 Pasos:\n1. Haz clic en "Enviar" nuevamente\n2. Si persiste, recarga la página\n\n✅ Tus datos están respaldados localmente.'
          : 'Unknown error while saving.\n\n📋 Steps:\n1. Click "Send" again\n2. If it persists, reload the page\n\n✅ Your data is backed up locally.';
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
        ref={focusTrapRef}
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
