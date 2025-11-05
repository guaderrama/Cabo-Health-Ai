import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Language } from '../types';

interface Consultation {
  id: string;
  session_id: string;
  language: string;
  status: string;
  created_at: string;
  completed_at: string;
  transcriptions: any[];
  summary: any;
  session: any;
}

interface ConsultationHistoryProps {
  language: Language;
  onClose: () => void;
}

const ConsultationHistory: React.FC<ConsultationHistoryProps> = ({ language, onClose }) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-consultations');

      if (error) throw error;

      if (data?.data?.consultations) {
        setConsultations(data.data.consultations);
      }
    } catch (err) {
      console.error('Error al cargar consultas:', err);
      setError(
        language === 'es'
          ? 'Error al cargar el historial de consultas'
          : 'Error loading consultation history'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-800">
            {language === 'es' ? 'Historial de Consultas' : 'Consultation History'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">
                {language === 'es' ? 'Cargando consultas...' : 'Loading consultations...'}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadConsultations}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'es' ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-600">
                {language === 'es'
                  ? 'No tienes consultas registradas aún'
                  : 'No consultations recorded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {consultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedConsultation(consultation)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">
                          {language === 'es' ? 'Consulta' : 'Consultation'} #{consultation.session_id.substring(0, 8)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          consultation.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {consultation.status === 'completed'
                            ? (language === 'es' ? 'Completada' : 'Completed')
                            : (language === 'es' ? 'En progreso' : 'In progress')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatDate(consultation.created_at)}
                      </p>
                    </div>
                    {consultation.session?.duration_seconds && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">
                          {formatDuration(consultation.session.duration_seconds)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {language === 'es' ? 'Duración' : 'Duration'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span>{consultation.transcriptions?.length || 0} mensajes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      <span className="uppercase">{consultation.language}</span>
                    </div>
                    {consultation.summary && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-600">
                          {language === 'es' ? 'Con resumen' : 'With summary'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>

      {/* Modal de detalle de consulta */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-slate-800">
                {language === 'es' ? 'Detalle de Consulta' : 'Consultation Detail'}
              </h3>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Transcripción */}
              {selectedConsultation.transcriptions && selectedConsultation.transcriptions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">
                    {language === 'es' ? 'Transcripción' : 'Transcript'}
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-50 rounded-lg p-4">
                    {selectedConsultation.transcriptions.map((t: any, idx: number) => (
                      <div key={idx} className={`flex ${t.sender === 'Nova' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          t.sender === 'Nova'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-green-100 text-green-900'
                        }`}>
                          <p className="text-xs font-semibold mb-1">{t.sender}</p>
                          <p className="text-sm">{t.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen */}
              {selectedConsultation.summary && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">
                    {language === 'es' ? 'Resumen Clínico' : 'Clinical Summary'}
                  </h4>
                  <div 
                    className="prose prose-sm max-w-none bg-slate-50 rounded-lg p-4"
                    dangerouslySetInnerHTML={{ __html: selectedConsultation.summary.html_content }}
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setSelectedConsultation(null)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationHistory;
