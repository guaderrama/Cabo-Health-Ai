import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Language } from '../types';
import { sanitizeHtml } from '../utils/sanitizeHtml';

interface Consultation {
  id: string;
  session_id: string;
  patient_name: string;
  patient_email: string;
  doctor_email: string;
  dob: string;
  language: string;
  created_at: string;
  duration: number;
  transcript: any[];
  summary: string;
  motivation_score?: number;
  empathy_score?: number;
  reflection_ratio?: number;
}

interface ConsultationHistoryProps {
  language: Language;
  onClose: () => void;
  userRole?: 'patient' | 'doctor';
}

const ConsultationHistory: React.FC<ConsultationHistoryProps> = ({ language, onClose, userRole = 'patient' }) => {
  const isDoctor = userRole === 'doctor';
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMotivation, setFilterMotivation] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadConsultations();
  }, []);

  // Scroll lock - Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);

      // Get current user's consultations directly from the database
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No user logged in');
      }

      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setConsultations(data);
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} seg`;
  };

  const getMotivationLevel = (score?: number) => {
    if (!score) return { level: 'unknown', color: 'bg-gray-200', textColor: 'text-gray-600' };
    if (score >= 7) return { level: 'high', color: 'bg-green-500', textColor: 'text-green-700' };
    if (score >= 4) return { level: 'medium', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'low', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  const filteredConsultations = consultations.filter(c => {
    const matchesSearch = c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.patient_email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMotivation === 'all') return true;
    if (filterMotivation === 'high') return (c.motivation_score || 0) >= 7;
    if (filterMotivation === 'medium') return (c.motivation_score || 0) >= 4 && (c.motivation_score || 0) < 7;
    if (filterMotivation === 'low') return (c.motivation_score || 0) < 4;

    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-800">
            📋 {language === 'es' ? 'Historial de Consultas' : 'Consultation History'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 transition-colors active:scale-95"
            title={language === 'es' ? 'Cerrar historial' : 'Close history'}
            aria-label={language === 'es' ? 'Cerrar' : 'Close'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters - Solo mostrar filtros avanzados para médicos */}
        <div className="p-4 border-b bg-slate-50 space-y-3">
          <div className="flex gap-4 items-center flex-wrap">
            {/* Search - Solo para médicos */}
            {isDoctor && (
              <div className="flex-1 min-w-[250px]">
                <input
                  type="text"
                  placeholder={language === 'es' ? 'Buscar paciente...' : 'Search patient...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Motivation Filter - Solo para médicos */}
            {isDoctor && (
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMotivation('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors active:scale-95 ${
                    filterMotivation === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                  title={language === 'es' ? 'Mostrar todas las consultas' : 'Show all consultations'}
                >
                  {language === 'es' ? 'Todas' : 'All'}
                </button>
                <button
                  onClick={() => setFilterMotivation('high')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors active:scale-95 ${
                    filterMotivation === 'high'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                  title={language === 'es' ? 'Filtrar por motivación alta (7-10)' : 'Filter by high motivation (7-10)'}
                >
                  {language === 'es' ? 'Alta' : 'High'} (≥7)
                </button>
                <button
                  onClick={() => setFilterMotivation('medium')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors active:scale-95 ${
                    filterMotivation === 'medium'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                  title={language === 'es' ? 'Filtrar por motivación media (4-6)' : 'Filter by medium motivation (4-6)'}
                >
                  {language === 'es' ? 'Media' : 'Medium'} (4-6)
                </button>
                <button
                  onClick={() => setFilterMotivation('low')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors active:scale-95 ${
                    filterMotivation === 'low'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
                  title={language === 'es' ? 'Filtrar por motivación baja (<4)' : 'Filter by low motivation (<4)'}
                >
                  {language === 'es' ? 'Baja' : 'Low'} (&lt;4)
                </button>
              </div>
            )}
          </div>

          <div className="text-sm text-slate-600">
            {language === 'es' ? 'Mostrando' : 'Showing'} {filteredConsultations.length} {language === 'es' ? 'de' : 'of'} {consultations.length} {language === 'es' ? 'consultas' : 'consultations'}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {/* Skeleton loaders - simulan la estructura de las consultas */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-lg p-5 bg-white animate-pulse"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                        <div className="h-6 bg-slate-200 rounded w-48"></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                        <div className="h-4 bg-slate-200 rounded w-40"></div>
                        <div className="h-4 bg-slate-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-full"></div>
                    <div className="h-3 bg-slate-200 rounded w-full"></div>
                    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                    <div className="h-10 bg-slate-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
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
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors active:scale-95"
                title={language === 'es' ? 'Cargar consultas nuevamente' : 'Load consultations again'}
              >
                {language === 'es' ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          ) : filteredConsultations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-600">
                {searchQuery || filterMotivation !== 'all'
                  ? (language === 'es' ? 'No se encontraron consultas' : 'No consultations found')
                  : (language === 'es' ? 'No tienes consultas registradas aún' : 'No consultations recorded yet')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultations.map((consultation) => {
                const motivationLevel = getMotivationLevel(consultation.motivation_score);

                return (
                  <div
                    key={consultation.id}
                    className="border border-slate-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer bg-white"
                    onClick={() => setSelectedConsultation(consultation)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">👤</span>
                            <span className="font-bold text-lg text-slate-800">
                              {consultation.patient_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <span className="text-lg">📧</span>
                            <span>{consultation.patient_email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-lg">📅</span>
                            <span>{formatDate(consultation.created_at)}</span>
                          </div>
                          {consultation.duration && (
                            <div className="flex items-center gap-1">
                              <span className="text-lg">⏱️</span>
                              <span>{formatDuration(consultation.duration)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Motivation Scores - Solo visible para médicos */}
                    {isDoctor && (consultation.motivation_score || consultation.empathy_score) && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                          📊 {language === 'es' ? 'Scores Motivacionales' : 'Motivational Scores'}
                        </h4>

                        {consultation.motivation_score != null && (
                          <div>
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span>{language === 'es' ? 'Motivación al Cambio' : 'Change Motivation'}</span>
                              <span className="font-semibold">{Number(consultation.motivation_score).toFixed(1)}/10</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className={`${motivationLevel.color} h-3 rounded-full transition-all duration-500`}
                                style={{ width: `${(consultation.motivation_score / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {consultation.empathy_score != null && (
                          <div>
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span>{language === 'es' ? 'Empatía de Nova' : 'Nova Empathy'}</span>
                              <span className="font-semibold">{Number(consultation.empathy_score).toFixed(1)}/10</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${(consultation.empathy_score / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {consultation.reflection_ratio != null && (
                          <div>
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span>{language === 'es' ? 'Ratio de Reflexión' : 'Reflection Ratio'}</span>
                              <span className="font-semibold">{Number(consultation.reflection_ratio).toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((consultation.reflection_ratio / 1) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Estado para pacientes - Muestra si fue enviado al médico */}
                    {!isDoctor && consultation.doctor_email && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{language === 'es' ? 'Enviado al médico' : 'Sent to doctor'}</span>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span>{consultation.transcript?.length || 0} {language === 'es' ? 'mensajes' : 'messages'}</span>
                      </div>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold active:scale-95"
                        title={language === 'es' ? 'Ver transcripción completa y resumen' : 'View full transcript and summary'}
                      >
                        {language === 'es' ? 'Ver Detalle' : 'View Details'} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold active:scale-95"
            title={language === 'es' ? 'Cerrar ventana de historial' : 'Close history window'}
          >
            {language === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>

      {/* Modal de detalle de consulta */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {language === 'es' ? 'Detalle de Consulta' : 'Consultation Detail'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedConsultation.patient_name} • {formatDate(selectedConsultation.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="text-slate-500 hover:text-slate-800 transition-colors active:scale-95"
                title={language === 'es' ? 'Cerrar detalle' : 'Close detail'}
                aria-label={language === 'es' ? 'Cerrar' : 'Close'}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Transcripción en formato chat */}
              {selectedConsultation.transcript && selectedConsultation.transcript.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">💬</span>
                    {language === 'es' ? 'Transcripción' : 'Transcript'}
                    <span className="text-sm font-normal text-slate-500">
                      ({selectedConsultation.duration ? formatDuration(selectedConsultation.duration) : ''})
                    </span>
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto bg-gradient-to-b from-slate-50 to-white rounded-lg p-4 border border-slate-200">
                    {selectedConsultation.transcript.map((t: any, idx: number) => {
                      const isNova = t.sender === 'Nova' || t.sender === 'nova';
                      const timestamp = t.timestamp ? new Date(t.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }) : '';

                      return (
                        <div key={idx} className={`flex ${isNova ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[75%] ${isNova ? 'order-1' : 'order-2'}`}>
                            <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                              isNova
                                ? 'bg-blue-100 text-blue-900 rounded-tl-none'
                                : 'bg-green-100 text-green-900 rounded-tr-none'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{isNova ? '🤖' : '👤'}</span>
                                <p className="text-xs font-bold">{isNova ? 'Nova' : (language === 'es' ? 'Paciente' : 'Patient')}</p>
                                {timestamp && <span className="text-xs opacity-60">({timestamp})</span>}
                              </div>
                              <p className="text-sm leading-relaxed">{t.text}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resumen Clínico - Solo visible para médicos */}
              {isDoctor && selectedConsultation.summary && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    {language === 'es' ? 'Resumen Clínico' : 'Clinical Summary'}
                  </h4>
                  <div
                    className="prose prose-sm max-w-none bg-white rounded-lg p-6 border border-slate-200 shadow-sm"
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedConsultation.summary) }}
                  />
                </div>
              )}

              {/* Mensaje para pacientes - El resumen fue enviado al médico */}
              {!isDoctor && selectedConsultation.summary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-blue-800 mb-2">
                    {language === 'es' ? 'Resumen enviado a tu médico' : 'Summary sent to your doctor'}
                  </h4>
                  <p className="text-sm text-blue-600">
                    {language === 'es'
                      ? 'El resumen clínico de esta consulta ha sido enviado a tu médico para su revisión.'
                      : 'The clinical summary of this consultation has been sent to your doctor for review.'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setSelectedConsultation(null)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold active:scale-95"
                title={language === 'es' ? 'Cerrar ventana de detalle' : 'Close detail window'}
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
              {/* Botón de imprimir - Solo para médicos */}
              {isDoctor && (
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Consulta - ${selectedConsultation.patient_name}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 20px; }
                              h1 { color: #1e293b; }
                              .summary { margin-top: 20px; }
                            </style>
                          </head>
                          <body>
                            <h1>Consulta - ${selectedConsultation.patient_name}</h1>
                            <p><strong>Fecha:</strong> ${formatDate(selectedConsultation.created_at)}</p>
                            <div class="summary">${sanitizeHtml(selectedConsultation.summary)}</div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2 active:scale-95"
                  title={language === 'es' ? 'Imprimir resumen clínico' : 'Print clinical summary'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  {language === 'es' ? 'Imprimir' : 'Print'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationHistory;
