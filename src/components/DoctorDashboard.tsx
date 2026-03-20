import React, { useEffect, useState, useMemo } from 'react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { type Language, type TranscriptMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import SystemsMatrixChart from './SystemsMatrixChart';
import DashboardStats from './DashboardStats';
import MotivationGauge from './MotivationGauge';
import ClinicalSummaryView from './ClinicalSummaryView';
import { logger } from '../lib/logger';
import { extractScoresFromSummary } from '../utils/consultation';
import { formatDate, formatDuration, getMotivationLevel } from '../utils/consultation';
import { SUMMARY_PROMPT } from '../constants/summaryPrompt';
import { GoogleGenAI } from '@google/genai';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import { completeSummary } from '../services/summaryQueue';

// Schema de validación para consultas de Supabase
// Nota: timestamp puede ser ISO string o epoch number según cómo se guardó
const TranscriptMessageSchema = z.object({
  sender: z.string(),
  text: z.string(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

// Supabase PostgREST devuelve columnas `numeric` como strings ("5.0")
// z.coerce.number() convierte strings numéricos a number automáticamente
const coercedNumber = z.coerce.number();

const ConsultationSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  patient_name: z.string(),
  patient_dob: z.string().nullable(),
  patient_email: z.string().nullable(),
  language: z.string(),
  created_at: z.string(),
  session_duration: coercedNumber,
  transcript: z.array(TranscriptMessageSchema),
  summary: z.string(),
  motivation_score: coercedNumber.nullable().optional(),
  empathy_score: coercedNumber.nullable().optional(),
  message_count: coercedNumber.nullable().optional(),
  status: z.string().nullable().optional(),
});

interface Consultation {
  id: string;
  session_id: string;
  patient_name: string;
  patient_dob: string;
  patient_email: string | null;
  language: string;
  created_at: string;
  session_duration: number;
  transcript: TranscriptMessage[];
  summary: string;
  motivation_score?: number;
  empathy_score?: number;
  message_count?: number;
  status?: string;
  /** User ID from pending_summaries (needed for regeneration) */
  user_id?: string;
  /** True when this entry comes from pending_summaries (not yet sent to doctor) */
  isPending?: boolean;
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
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  useEffect(() => {
    loadConsultations();
  }, [user?.id]);

  const handleDeleteConsultation = async (consultation: Consultation) => {
    try {
      // Delete from the correct table based on whether it's a pending or completed consultation
      const table = consultation.isPending ? 'pending_summaries' : 'consultations';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', consultation.id);

      if (error) throw error;

      // Remove from local state
      setConsultations(prev => prev.filter(c => c.id !== consultation.id));
      setConsultationToDelete(null);
    } catch (err) {
      logger.error('Error deleting consultation:', err);
      alert(language === 'es' ? 'Error al eliminar la consulta' : 'Error deleting consultation');
    }
  };

  const handleRegenerateSummary = async (consultation: Consultation) => {
    setRegenerating(true);
    setRegenerateError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not configured');

      // Build transcript text
      const transcript = consultation.transcript || [];
      const fullTranscriptText = transcript
        .map((msg: TranscriptMessage) => `${msg.sender}: ${msg.text}`)
        .join('\n');

      if (!fullTranscriptText || fullTranscriptText.length < 50) {
        throw new Error(language === 'es'
          ? 'La transcripción es demasiado corta para generar un resumen'
          : 'Transcript too short to generate summary');
      }

      const lang = (consultation.language || 'es') as 'es' | 'en';
      const prompt = SUMMARY_PROMPT[lang](fullTranscriptText);

      // Call Gemini API with fallback
      const ai = new GoogleGenAI({ apiKey });
      let response;

      try {
        response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: { maxOutputTokens: 16384 },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 120000)
          ),
        ]);
      } catch (gemini3Error) {
        logger.warn('Gemini 3.1 Pro failed, falling back to 3 Flash:', gemini3Error);
        response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { maxOutputTokens: 16384 },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 120000)
          ),
        ]);
      }

      const summaryText = sanitizeHtml(response.text ?? '');

      if (!summaryText || summaryText.trim().length < 50) {
        throw new Error(language === 'es'
          ? 'El resumen generado está vacío o es muy corto'
          : 'Generated summary is empty or too short');
      }

      // Mark pending_summaries as completed
      const completeResult = await completeSummary(consultation.session_id, summaryText);
      if (!completeResult.success) {
        logger.warn('completeSummary failed:', completeResult.error);
      }

      // Save directly to consultations table (upsert to handle duplicates)
      const userId = consultation.user_id || user?.id || '';
      const { motivationScore, empathyScore } = extractScoresFromSummary(summaryText);

      const { error: upsertError } = await supabase
        .from('consultations')
        .upsert([{
          session_id: consultation.session_id,
          user_id: userId,
          patient_name: consultation.patient_name,
          patient_email: consultation.patient_email || null,
          language: lang,
          transcript: consultation.transcript,
          summary: summaryText,
          motivation_score: motivationScore,
          empathy_score: empathyScore,
          session_duration: consultation.session_duration,
          message_count: (consultation.transcript || []).length,
          status: 'completed',
        }], { onConflict: 'session_id' });

      if (upsertError) {
        throw new Error(`Error saving consultation: ${upsertError.message}`);
      }

      // Update local state immediately
      if (selectedConsultation?.session_id === consultation.session_id) {
        setSelectedConsultation({
          ...selectedConsultation,
          summary: summaryText,
          isPending: false,
          status: 'completed',
        });
      }

      // Refresh consultations list
      await loadConsultations();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Error regenerating summary:', err);
      setRegenerateError(message);
    } finally {
      setRegenerating(false);
    }
  };

  const loadConsultations = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user || !user.email) {
        throw new Error('No user logged in');
      }

      logger.debug('🏥 Loading consultations for doctor');

      // Load completed consultations
      const { data, error: consultError } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (consultError) {
        logger.error('Error al cargar consultas:', consultError);
        throw consultError;
      }

      // Also load pending_summaries that have transcripts but were never sent to consultations
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (pendingError) {
        // Non-blocking: pending summaries are supplemental
        logger.warn('Could not load pending summaries:', pendingError);
      }

      logger.debug('✅ Consultas cargadas:', data?.length || 0, '| Pendientes:', pendingData?.length || 0);

      // Collect session_ids from completed consultations to avoid duplicates
      const completedSessionIds = new Set(
        (data || []).map((c: Record<string, unknown>) => c.session_id as string)
      );

      // Convert pending_summaries to Consultation format (those NOT already in consultations)
      const pendingFiltered = (pendingData || [])
        .filter((p: Record<string, unknown>) => !completedSessionIds.has(p.session_id as string))
        .filter((p: Record<string, unknown>) => {
          const transcript = p.transcript as TranscriptMessage[] | null;
          return transcript && transcript.length >= 2;
        });

      // Lookup patient emails for pending summaries via secure RPC
      let userEmailMap: Record<string, string> = {};
      if (pendingFiltered.length > 0) {
        const userIds = [...new Set(pendingFiltered.map((p: Record<string, unknown>) => p.user_id as string))];
        const { data: emailData } = await supabase.rpc('get_patient_emails', { user_ids: userIds });
        if (emailData) {
          for (const row of emailData as Array<{ id: string; email: string }>) {
            userEmailMap[row.id] = row.email;
          }
        }
      }

      const pendingAsConsultations: Consultation[] = pendingFiltered
        .map((p: Record<string, unknown>) => ({
          id: p.id as string,
          session_id: p.session_id as string,
          patient_name: (p.patient_name as string) || 'Unknown',
          patient_dob: '',
          patient_email: userEmailMap[p.user_id as string] || null,
          language: (p.language as string) || 'en',
          created_at: p.created_at as string,
          session_duration: (p.session_duration as number) || 0,
          transcript: (p.transcript as TranscriptMessage[]) || [],
          summary: (p.summary as string) || '',
          message_count: ((p.transcript as TranscriptMessage[]) || []).length,
          user_id: p.user_id as string,
          status: p.status as string,
          isPending: true,
        }));

      // Validate completed consultations
      const validConsultations = (data || []).filter((consultation: Record<string, unknown>, index: number) => {
        const result = ConsultationSchema.safeParse(consultation);
        if (!result.success) {
          logger.warn(`Consulta #${index} inválida (id: ${(consultation.id as string) || 'unknown'}):`, {
            errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
          });
          return false;
        }
        return true;
      }) as Consultation[];

      if (data && validConsultations.length < data.length) {
        logger.warn(`${data.length - validConsultations.length} consultas filtradas por datos inválidos`);
      }

      // Merge: pending first (they need attention), then completed
      const allConsultations = [...pendingAsConsultations, ...validConsultations];
      // Sort all by date descending
      allConsultations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      logger.debug('📊 Total consultations to display:', allConsultations.length, '(completed:', validConsultations.length, '| pending:', pendingAsConsultations.length, ')');

      setConsultations(allConsultations);
    } catch (err) {
      logger.error('Error al cargar consultas:', err);
      setError(
        language === 'es'
          ? 'Error al cargar las consultas'
          : 'Error loading consultations'
      );
    } finally {
      setLoading(false);
    }
  };

  const getAlertBadge = (consultation: Consultation) => {
    const motivationScore = consultation.motivation_score || 0;
    let criticalSystemsCount = 0;

    // Analizar summary para contar sistemas críticos
    if (consultation.summary) {
      const systems = ['DIGESTIÓN', 'ENERGÍA', 'MENTE', 'HORMONAL', 'INMUNE', 'ESTRUCTURA'];
      systems.forEach(system => {
        const match = consultation.summary!.match(new RegExp(`${system}[\\s\\S]*?(\\d+)\\/10`, 'i'));
        if (match && match[1] && parseInt(match[1]) < 4) {
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

  const filteredConsultations = useMemo(() => consultations.filter(c => {
    const matchesSearch = c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.patient_email && c.patient_email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMotivation === 'all') return true;
    if (filterMotivation === 'high') return (c.motivation_score || 0) >= 7;
    if (filterMotivation === 'medium') return (c.motivation_score || 0) >= 4 && (c.motivation_score || 0) < 7;
    if (filterMotivation === 'low') return (c.motivation_score || 0) < 4;

    return true;
  }), [consultations, searchQuery, filterMotivation]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-6 pt-24">
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
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
              />
            </div>

            {/* Motivation Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterMotivation('all')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${filterMotivation === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
              >
                {language === 'es' ? 'Todas' : 'All'}
              </button>
              <button
                onClick={() => setFilterMotivation('high')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${filterMotivation === 'high'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
              >
                {language === 'es' ? 'Alta' : 'High'} (≥7)
              </button>
              <button
                onClick={() => setFilterMotivation('medium')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${filterMotivation === 'medium'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                  }`}
              >
                {language === 'es' ? 'Media' : 'Medium'} (4-6)
              </button>
              <button
                onClick={() => setFilterMotivation('low')}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${filterMotivation === 'low'
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
            <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin mb-4"></div>
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
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
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
                  className={`bg-white border rounded-xl p-6 hover:shadow-xl transition-all cursor-pointer relative ${
                    consultation.isPending
                      ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                      : 'border-slate-200 hover:border-teal-400'
                  }`}
                  onClick={() => setSelectedConsultation(consultation)}
                >
                  {/* Pending Badge */}
                  {consultation.isPending && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg animate-pulse">
                      <span>⏳</span>
                      <span>{language === 'es' ? 'PENDIENTE' : 'PENDING'}</span>
                    </div>
                  )}
                  {/* Alert Badge */}
                  {!consultation.isPending && alertBadge && (
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
                          <span>{formatDate(consultation.created_at, language)}</span>
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConsultationToDelete(consultation);
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                        title={language === 'es' ? 'Eliminar consulta' : 'Delete consultation'}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold">
                        {language === 'es' ? 'Ver Detalle' : 'View Details'} →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {consultationToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">
              {language === 'es' ? '¿Eliminar consulta?' : 'Delete consultation?'}
            </h3>
            <p className="text-center text-slate-600 mb-6">
              {language === 'es'
                ? `Estás a punto de eliminar permanentemente la consulta de ${consultationToDelete.patient_name}. Esta acción no se puede deshacer.`
                : `You are about to permanently delete the consultation for ${consultationToDelete.patient_name}. This action cannot be undone.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConsultationToDelete(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-semibold"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteConsultation(consultationToDelete)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                {language === 'es' ? 'Sí, Eliminar' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalle de consulta */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-teal-50 to-cyan-50">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {language === 'es' ? 'Detalle de Consulta' : 'Consultation Detail'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedConsultation.patient_name} • {formatDate(selectedConsultation.created_at, language)}
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
                    {selectedConsultation.transcript.map((t: TranscriptMessage, idx: number) => {
                      const isNova = t.sender === 'Nova';
                      const timestamp = t.timestamp ? new Date(t.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }) : '';

                      return (
                        <div key={idx} className={`flex ${isNova ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[75%] ${isNova ? 'order-1' : 'order-2'}`}>
                            <div className={`rounded-2xl px-4 py-3 shadow-sm ${isNova
                              ? 'bg-teal-50 text-teal-900 rounded-tl-none'
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

              {/* Pending consultation notice */}
              {selectedConsultation.isPending && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-start gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <h4 className="font-bold text-amber-800">
                      {language === 'es' ? 'Consulta Pendiente' : 'Pending Consultation'}
                    </h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {language === 'es'
                        ? 'El paciente completó la entrevista pero el resumen clínico no fue generado o enviado. La transcripción completa está disponible abajo.'
                        : 'The patient completed the interview but the clinical summary was not generated or sent. The full transcript is available below.'}
                    </p>
                    <button
                      onClick={() => handleRegenerateSummary(selectedConsultation)}
                      disabled={regenerating}
                      className="mt-3 w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {regenerating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {language === 'es' ? 'Generando resumen clínico...' : 'Generating clinical summary...'}
                        </>
                      ) : (
                        <>
                          <span>🔄</span>
                          {language === 'es' ? 'Regenerar Resumen Clínico' : 'Regenerate Clinical Summary'}
                        </>
                      )}
                    </button>
                    {regenerateError && (
                      <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        {regenerateError}
                      </p>
                    )}
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
              {/* Regenerate button for completed consultations with transcript */}
              {!selectedConsultation.isPending && selectedConsultation.transcript && (
                <button
                  onClick={() => handleRegenerateSummary(selectedConsultation)}
                  disabled={regenerating}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {regenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {language === 'es' ? 'Regenerando...' : 'Regenerating...'}
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      {language === 'es' ? 'Regenerar Reporte' : 'Regenerate Report'}
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setSelectedConsultation(null)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
              <button
                onClick={() => {
                  // Extraer datos de sistemas del summary (solo de la sección Systems Matrix)
                  let systemsTable = '';
                  if (selectedConsultation.summary) {
                    const sysSection = selectedConsultation.summary.match(/Systems Matrix[\s\S]*?(?=Executive Summary|Análisis Clínico|Clinical Analysis|📋|🩺|$)/i)?.[0] || selectedConsultation.summary;
                    const systems = ['DIGESTIÓN', 'DIGESTION', 'ENERGÍA', 'ENERGY', 'MENTE', 'MIND', 'HORMONAL', 'INMUNE', 'IMMUNE', 'ESTRUCTURA', 'STRUCTURE'];
                    const seen = new Set<string>();
                    const systemsData: string[] = [];
                    systems.forEach(system => {
                      const baseNames: Record<string, string> = { 'DIGESTION': 'DIGESTIÓN', 'ENERGY': 'ENERGÍA', 'MIND': 'MENTE', 'IMMUNE': 'INMUNE', 'STRUCTURE': 'ESTRUCTURA' };
                      const base = baseNames[system] || system;
                      if (seen.has(base)) return;
                      const match = sysSection.match(new RegExp(`${system}[\\s\\S]*?(\\d+)\\/10`, 'i'));
                      if (match && match[1]) {
                        seen.add(base);
                        const score = parseInt(match[1]);
                        const status = score >= 7 ? '🟢 Óptimo' : score >= 4 ? '🟡 Moderado' : '🔴 Crítico';
                        systemsData.push(`
                          <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${base}</td>
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
                              border-bottom: 4px solid #0F766E;
                              padding-bottom: 20px;
                              margin-bottom: 30px;
                            }
                            .logo {
                              font-size: 32px;
                              font-weight: bold;
                              color: #0F766E;
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
                              background: linear-gradient(135deg, #0F766E 0%, #155E75 100%);
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
                              font-weight: 500;
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
                              <div class="info-value">${formatDate(selectedConsultation.created_at, language)}</div>
                            </div>
                            <div class="info-row">
                              <div class="info-label">Duración de Sesión:</div>
                              <div class="info-value">${formatDuration(selectedConsultation.session_duration)}</div>
                            </div>
                          </div>

                          <!-- Motivational Scores -->
                          ${selectedConsultation.motivation_score != null || selectedConsultation.empathy_score != null ? `
                            <div class="scores">
                              ${selectedConsultation.motivation_score != null ? `
                                <div class="score-card">
                                  <div class="score-label">Motivación al Cambio</div>
                                  <div class="score-value">${Number(selectedConsultation.motivation_score).toFixed(1)}</div>
                                  <div class="score-label">/10</div>
                                </div>
                              ` : ''}
                              ${selectedConsultation.empathy_score != null ? `
                                <div class="score-card">
                                  <div class="score-label">Empatía de Nova</div>
                                  <div class="score-value">${Number(selectedConsultation.empathy_score).toFixed(1)}</div>
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
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold flex items-center gap-2"
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
