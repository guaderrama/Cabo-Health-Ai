import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type Language } from '../types';
import { useAuth } from '../contexts/AuthContext';
import SystemsMatrixChart from './SystemsMatrixChart';
import DashboardStats from './DashboardStats';
import MotivationGauge from './MotivationGauge';
import ClinicalSummaryView from './ClinicalSummaryView';

interface Consultation {
  id: string;
  session_id: string;
  patient_name: string;
  patient_dob: string;
  patient_email: string | null;
  language: string;
  created_at: string;
  session_duration: number;
  transcript: any[];
  summary: string;
  motivation_score?: number;
  empathy_score?: number;
  message_count?: number;
  status?: string;
}

interface DoctorDashboardProps {
  language: Language;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ language }) => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMotivation, setFilterMotivation] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadConsultations();
  }, [user]);

  const loadConsultations = async () => {
    try {
      setLoading(true);

      if (!user || !user.email) {
        throw new Error('No user logged in');
      }

      console.log('🏥 [DASHBOARD DEBUG] Cargando consultas para médico:', user.email);

      // Load ALL consultations (all doctors see all patients)
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [DASHBOARD DEBUG] Error al cargar:', error);
        throw error;
      }

      console.log('✅ [DASHBOARD DEBUG] Consultas cargadas:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📋 [DASHBOARD DEBUG] Primera consulta:', {
          patient_name: data[0].patient_name,
          created_at: data[0].created_at,
          id: data[0].id
        });
      }

      if (data) {
        setConsultations(data);
      }
    } catch (err) {
      console.error('❌ [DASHBOARD DEBUG] Error al cargar consultas:', err);
      setError(
        language === 'es'
          ? 'Error al cargar las consultas'
          : 'Error loading consultations'
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
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

  const getAlertBadge = (consultation: Consultation) => {
    const motivationScore = consultation.motivation_score || 0;
    let criticalSystemsCount = 0;

    // Analizar summary para contar sistemas críticos
    if (consultation.summary) {
      const systems = ['DIGESTIÓN', 'ENERGÍA', 'MENTE', 'HORMONAL', 'INMUNE', 'ESTRUCTURA'];
      systems.forEach(system => {
        const match = consultation.summary!.match(new RegExp(`${system}[\\s\\S]*?(\\d+)\\/10`, 'i'));
        if (match && parseInt(match[1]) < 4) {
          criticalSystemsCount++;
        }
      });
    }

    // Determinar badge
    if (motivationScore < 3 && criticalSystemsCount >= 2) {
      return {
        label: language === 'es' ? 'URGENTE' : 'URGENT',
        icon: '🔴',
        bgColor: 'bg-red-600',
        textColor: 'text-white',
        pulse: true
      };
    }
    if (criticalSystemsCount >= 2) {
      return {
        label: language === 'es' ? 'ATENCIÓN' : 'ATTENTION',
        icon: '⚠️',
        bgColor: 'bg-orange-500',
        textColor: 'text-white',
        pulse: false
      };
    }
    if (motivationScore >= 4 && motivationScore < 7) {
      return {
        label: language === 'es' ? 'SEGUIMIENTO' : 'FOLLOW-UP',
        icon: '🟡',
        bgColor: 'bg-yellow-500',
        textColor: 'text-white',
        pulse: false
      };
    }
    if (motivationScore >= 7) {
      return {
        label: language === 'es' ? 'ESTABLE' : 'STABLE',
        icon: '🟢',
        bgColor: 'bg-green-500',
        textColor: 'text-white',
        pulse: false
      };
    }

    return null;
  };

  const filteredConsultations = consultations.filter(c => {
    const matchesSearch = c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (c.patient_email && c.patient_email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMotivation === 'all') return true;
    if (filterMotivation === 'high') return (c.motivation_score || 0) >= 7;
    if (filterMotivation === 'medium') return (c.motivation_score || 0) >= 4 && (c.motivation_score || 0) < 7;
    if (filterMotivation === 'low') return (c.motivation_score || 0) < 4;

    return true;
  });

  // Debug filtros
  React.useEffect(() => {
    if (consultations.length > 0) {
      console.log('🔍 [FILTROS DEBUG] Estado de filtros:', {
        searchQuery,
        filterMotivation,
        totalConsultations: consultations.length,
        filteredConsultations: filteredConsultations.length,
        hidden: consultations.length - filteredConsultations.length
      });

      if (filteredConsultations.length < consultations.length) {
        console.log('⚠️ [FILTROS DEBUG] Consultas ocultas por filtros:');
        const hidden = consultations.filter(c => !filteredConsultations.includes(c));
        hidden.forEach(c => {
          console.log(`   - ${c.patient_name} (motivation: ${c.motivation_score || 'N/A'})`);
        });
      }
    }
  }, [consultations, filteredConsultations, searchQuery, filterMotivation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            👨‍⚕️ {language === 'es' ? 'Panel del Médico' : 'Doctor Dashboard'}
          </h1>
          <p className="text-slate-600">
            {language === 'es'
              ? 'Todas las consultas de pacientes'
              : 'All patient consultations'}
          </p>
        </div>

        {/* Dashboard Statistics */}
        {!loading && consultations.length > 0 && (
          <DashboardStats consultations={consultations} language={language} />
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <input
                type="text"
                placeholder={language === 'es' ? 'Buscar paciente...' : 'Search patient...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
              />
            </div>

            {/* Motivation Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterMotivation('all')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  filterMotivation === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {language === 'es' ? 'Todas' : 'All'}
              </button>
              <button
                onClick={() => setFilterMotivation('high')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  filterMotivation === 'high'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {language === 'es' ? 'Alta' : 'High'} (≥7)
              </button>
              <button
                onClick={() => setFilterMotivation('medium')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  filterMotivation === 'medium'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {language === 'es' ? 'Media' : 'Medium'} (4-6)
              </button>
              <button
                onClick={() => setFilterMotivation('low')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  filterMotivation === 'low'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {language === 'es' ? 'Baja' : 'Low'} (&lt;4)
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-600 mt-4">
            {language === 'es' ? 'Mostrando' : 'Showing'} <strong>{filteredConsultations.length}</strong> {language === 'es' ? 'de' : 'of'} <strong>{consultations.length}</strong> {language === 'es' ? 'consultas' : 'consultations'}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 text-lg">
              {language === 'es' ? 'Cargando consultas...' : 'Loading consultations...'}
            </p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button
              onClick={loadConsultations}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              {language === 'es' ? 'Reintentar' : 'Retry'}
            </button>
          </div>
        ) : filteredConsultations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-600 text-lg">
              {searchQuery || filterMotivation !== 'all'
                ? (language === 'es' ? 'No se encontraron consultas' : 'No consultations found')
                : (language === 'es' ? 'No has recibido consultas aún' : 'No consultations received yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredConsultations.map((consultation) => {
              const motivationLevel = getMotivationLevel(consultation.motivation_score);
              const alertBadge = getAlertBadge(consultation);

              return (
                <div
                  key={consultation.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:border-purple-400 hover:shadow-xl transition-all cursor-pointer relative"
                  onClick={() => setSelectedConsultation(consultation)}
                >
                  {/* Alert Badge */}
                  {alertBadge && (
                    <div className={`absolute top-4 right-4 ${alertBadge.bgColor} ${alertBadge.textColor} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg ${alertBadge.pulse ? 'animate-pulse' : ''}`}>
                      <span>{alertBadge.icon}</span>
                      <span>{alertBadge.label}</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">👤</span>
                        <div>
                          <h3 className="font-bold text-xl text-slate-800">
                            {consultation.patient_name}
                          </h3>
                          {consultation.patient_email && (
                            <p className="text-sm text-slate-600">{consultation.patient_email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-3">
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{formatDate(consultation.created_at)}</span>
                        </div>
                        {consultation.session_duration && (
                          <div className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{formatDuration(consultation.session_duration)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Motivation Scores - Circular Gauges */}
                  {(consultation.motivation_score || consultation.empathy_score) && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 text-center">
                        📊 {language === 'es' ? 'Scores Motivacionales' : 'Motivational Scores'}
                      </h4>
                      <div className="flex justify-center gap-6">
                        {consultation.motivation_score !== undefined && (
                          <MotivationGauge
                            score={consultation.motivation_score}
                            label={language === 'es' ? 'Motivación' : 'Motivation'}
                          />
                        )}
                        {consultation.empathy_score !== undefined && (
                          <MotivationGauge
                            score={consultation.empathy_score}
                            label={language === 'es' ? 'Empatía' : 'Empathy'}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span>{consultation.message_count || consultation.transcript?.length || 0} {language === 'es' ? 'mensajes' : 'messages'}</span>
                    </div>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold">
                      {language === 'es' ? 'Ver Detalle' : 'View Details'} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalle de consulta */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
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
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Patient Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  ℹ️ {language === 'es' ? 'Información del Paciente' : 'Patient Information'}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">{language === 'es' ? 'Nombre:' : 'Name:'}</span>
                    <span className="ml-2 font-semibold">{selectedConsultation.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">{language === 'es' ? 'Fecha de Nacimiento:' : 'Date of Birth:'}</span>
                    <span className="ml-2 font-semibold">{selectedConsultation.patient_dob}</span>
                  </div>
                  {selectedConsultation.patient_email && (
                    <div>
                      <span className="text-slate-600">Email:</span>
                      <span className="ml-2 font-semibold">{selectedConsultation.patient_email}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-600">{language === 'es' ? 'Duración:' : 'Duration:'}</span>
                    <span className="ml-2 font-semibold">{formatDuration(selectedConsultation.session_duration)}</span>
                  </div>
                </div>
              </div>

              {/* Transcripción en formato chat */}
              {selectedConsultation.transcript && selectedConsultation.transcript.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">💬</span>
                    {language === 'es' ? 'Transcripción' : 'Transcript'}
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
                                ? 'bg-purple-100 text-purple-900 rounded-tl-none'
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

              {/* Spider Chart de Matriz de Sistemas */}
              {selectedConsultation.summary && (
                <SystemsMatrixChart summaryHTML={selectedConsultation.summary} />
              )}

              {/* Resumen Clínico Mejorado con Tabs y Dashboard */}
              {selectedConsultation.summary && (
                <div className="bg-slate-50 rounded-xl p-1 border-2 border-slate-200 shadow-lg">
                  <ClinicalSummaryView
                    summaryHTML={selectedConsultation.summary}
                    language={language}
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setSelectedConsultation(null)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
              <button
                onClick={() => {
                  // Extraer datos de sistemas del summary
                  let systemsTable = '';
                  if (selectedConsultation.summary) {
                    const systems = ['DIGESTIÓN', 'ENERGÍA', 'MENTE', 'HORMONAL', 'INMUNE', 'ESTRUCTURA'];
                    const systemsData: string[] = [];
                    systems.forEach(system => {
                      const match = selectedConsultation.summary!.match(new RegExp(`${system}[\\s\\S]*?(\\d+)\\/10`, 'i'));
                      if (match) {
                        const score = parseInt(match[1]);
                        const status = score >= 7 ? '🟢 Óptimo' : score >= 4 ? '🟡 Moderado' : '🔴 Crítico';
                        systemsData.push(`
                          <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${system}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${score}/10</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${status}</td>
                          </tr>
                        `);
                      }
                    });
                    if (systemsData.length > 0) {
                      systemsTable = `
                        <div style="margin: 30px 0;">
                          <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 18px;">🔬 Matriz de Sistemas</h3>
                          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                            <thead>
                              <tr style="background: #f8fafc;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1;">Sistema</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1;">Puntuación</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1;">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${systemsData.join('')}
                            </tbody>
                          </table>
                        </div>
                      `;
                    }
                  }

                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>Reporte Médico - ${selectedConsultation.patient_name}</title>
                          <style>
                            @media print {
                              body { margin: 0; }
                              .no-print { display: none; }
                            }
                            body {
                              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                              padding: 40px;
                              max-width: 900px;
                              margin: 0 auto;
                              color: #1e293b;
                              line-height: 1.6;
                            }
                            .header {
                              border-bottom: 4px solid #8b5cf6;
                              padding-bottom: 20px;
                              margin-bottom: 30px;
                            }
                            .logo {
                              font-size: 32px;
                              font-weight: bold;
                              color: #8b5cf6;
                              margin-bottom: 10px;
                            }
                            h1 {
                              color: #1e293b;
                              font-size: 28px;
                              margin: 0;
                            }
                            .patient-info {
                              background: #f8fafc;
                              padding: 20px;
                              border-radius: 8px;
                              margin: 20px 0;
                            }
                            .info-row {
                              display: flex;
                              margin: 10px 0;
                            }
                            .info-label {
                              font-weight: bold;
                              width: 180px;
                              color: #64748b;
                            }
                            .info-value {
                              color: #1e293b;
                            }
                            .scores {
                              display: flex;
                              gap: 20px;
                              margin: 30px 0;
                            }
                            .score-card {
                              flex: 1;
                              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white;
                              padding: 20px;
                              border-radius: 8px;
                              text-align: center;
                            }
                            .score-value {
                              font-size: 36px;
                              font-weight: bold;
                              margin: 10px 0;
                            }
                            .score-label {
                              font-size: 14px;
                              opacity: 0.9;
                            }
                            .summary {
                              margin-top: 30px;
                              padding: 20px;
                              background: white;
                              border: 1px solid #e2e8f0;
                              border-radius: 8px;
                            }
                            .footer {
                              margin-top: 50px;
                              padding-top: 20px;
                              border-top: 2px solid #e2e8f0;
                              text-align: center;
                              color: #64748b;
                              font-size: 12px;
                            }
                            table {
                              font-size: 14px;
                            }
                          </style>
                        </head>
                        <body>
                          <!-- Header -->
                          <div class="header">
                            <div class="logo">⚕️ Cabo Health Nova</div>
                            <h1>Reporte Médico Integral</h1>
                          </div>

                          <!-- Patient Information -->
                          <div class="patient-info">
                            <h2 style="margin-top: 0; color: #1e293b; font-size: 20px;">Información del Paciente</h2>
                            <div class="info-row">
                              <div class="info-label">Nombre:</div>
                              <div class="info-value">${selectedConsultation.patient_name}</div>
                            </div>
                            <div class="info-row">
                              <div class="info-label">Fecha de Nacimiento:</div>
                              <div class="info-value">${selectedConsultation.patient_dob}</div>
                            </div>
                            <div class="info-row">
                              <div class="info-label">Email:</div>
                              <div class="info-value">${selectedConsultation.patient_email || 'N/A'}</div>
                            </div>
                            <div class="info-row">
                              <div class="info-label">Fecha de Consulta:</div>
                              <div class="info-value">${formatDate(selectedConsultation.created_at)}</div>
                            </div>
                            <div class="info-row">
                              <div class="info-label">Duración de Sesión:</div>
                              <div class="info-value">${formatDuration(selectedConsultation.session_duration)}</div>
                            </div>
                          </div>

                          <!-- Motivational Scores -->
                          ${selectedConsultation.motivation_score || selectedConsultation.empathy_score ? `
                            <div class="scores">
                              ${selectedConsultation.motivation_score !== undefined ? `
                                <div class="score-card">
                                  <div class="score-label">Motivación al Cambio</div>
                                  <div class="score-value">${selectedConsultation.motivation_score.toFixed(1)}</div>
                                  <div class="score-label">/10</div>
                                </div>
                              ` : ''}
                              ${selectedConsultation.empathy_score !== undefined ? `
                                <div class="score-card">
                                  <div class="score-label">Empatía de Nova</div>
                                  <div class="score-value">${selectedConsultation.empathy_score.toFixed(1)}</div>
                                  <div class="score-label">/10</div>
                                </div>
                              ` : ''}
                            </div>
                          ` : ''}

                          <!-- Systems Matrix Table -->
                          ${systemsTable}

                          <!-- Clinical Summary -->
                          <div class="summary">
                            <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">📋 Resumen Clínico</h3>
                            ${selectedConsultation.summary}
                          </div>

                          <!-- Footer -->
                          <div class="footer">
                            <p><strong>Cabo Health Nova - AI Medical Assistant</strong></p>
                            <p>Reporte generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            <p style="margin-top: 20px; font-size: 11px;">Este documento es confidencial y está destinado únicamente para uso médico profesional.</p>
                          </div>

                          <script>
                            window.onload = function() {
                              setTimeout(function() {
                                window.print();
                              }, 500);
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {language === 'es' ? 'Imprimir' : 'Print'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
