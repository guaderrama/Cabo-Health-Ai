import { type Language } from '../types';

export const SUMMARY_PROMPT: Record<Language, (transcript: string) => string> = {
  es: (transcript: string) => `
    Eres un médico experto analista de IA especializado en Medicina Funcional y Entrevista Motivacional.
    Analiza la transcripción completa y genera un INFORME MÉDICO INTEGRAL profesional y exhaustivo.

    ## ESTRUCTURA REQUERIDA (HTML profesional):

    <div class="medical-report" style="font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto;">

      <!-- SECCIÓN 1: INFORMACIÓN DEL PACIENTE -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-left: 4px solid #0F766E; border-radius: 8px;">
        <h2 style="color: #0F766E; margin-bottom: 1rem;">👤 Información del Paciente</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 0.5rem; font-weight: 600;">Motivo principal de consulta:</td><td style="padding: 0.5rem;">[Descripción breve y específica]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">Objetivos del paciente:</td><td style="padding: 0.5rem;">[Lista de objetivos mencionados]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">Duración de síntomas:</td><td style="padding: 0.5rem;">[Tiempo desde inicio]</td></tr>
        </table>
      </div>

      <!-- DASHBOARD VISUAL -->
      <div class="dashboard" style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #0F766E 0%, #155E75 100%); border-radius: 12px; color: white;">
        <h2 style="color: white; margin-bottom: 1.5rem; font-size: 1.5rem;">📊 Vista Rápida - Dashboard Clínico</h2>

        <!-- Métricas Clave en Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">🚨 Alertas Críticas</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X]</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">📋 Completitud</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X/20]</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">💪 Motivación</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X/10]</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">⏱️ Duración</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X min]</div>
          </div>
        </div>

        <!-- Red Flags (Solo si existen) -->
        <div style="background: rgba(239, 68, 68, 0.95); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <h3 style="margin: 0 0 0.75rem 0; color: white; font-size: 1.125rem;">🔴 ALERTAS URGENTES - Revisar Inmediatamente</h3>
          <ul style="margin: 0; padding-left: 1.5rem; line-height: 1.8;">
            [SI HAY RED FLAGS: listarlos aquí con formato: ⚠️ Descripción del red flag]
            [SI NO HAY: escribir "✅ No se detectaron alertas críticas"]
          </ul>
        </div>

        <!-- Barra de Progreso Motivacional -->
        <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px;">
          <h3 style="margin: 0 0 1rem 0; font-size: 1rem;">💪 Disposición al Cambio</h3>
          <div style="margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="font-size: 0.875rem;">Importancia</span>
              <span style="font-size: 0.875rem; font-weight: 700;">[X/10]</span>
            </div>
            <div style="background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: #10b981; height: 100%; width: [X]0%;"></div>
            </div>
          </div>
          <div style="margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="font-size: 0.875rem;">Confianza</span>
              <span style="font-size: 0.875rem; font-weight: 700;">[X/10]</span>
            </div>
            <div style="background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: #0F766E; height: 100%; width: [X]0%;"></div>
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="font-size: 0.875rem;">Readiness</span>
              <span style="font-size: 0.875rem; font-weight: 700;">[X/10]</span>
            </div>
            <div style="background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: #f59e0b; height: 100%; width: [X]0%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- MATRIZ DE SISTEMAS (FUNCTIONAL MEDICINE MATRIX) -->
      <div class="systems-matrix" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-left: 4px solid #0F766E; border-radius: 8px;">
        <h2 style="color: #0F766E; margin-bottom: 1.5rem; font-size: 1.5rem;">🔬 Matriz de Sistemas - Functional Medicine</h2>
        <p style="color: #64748b; margin-bottom: 1.5rem; font-size: 0.875rem;">Evaluación del estado de los sistemas corporales principales (escala 0-10, donde 10 es óptimo)</p>

        <!-- Grid de 6 Sistemas -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">

          <!-- Sistema 1: DIGESTIÓN -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🍽️ DIGESTIÓN</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #0F766E;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #0F766E; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Breve evaluación: síntomas digestivos, hábitos intestinales, sensibilidades]
            </p>
          </div>

          <!-- Sistema 2: ENERGÍA -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">⚡ ENERGÍA</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #f59e0b; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Breve evaluación: nivel energético diario, sueño, fatiga, mitocondrial]
            </p>
          </div>

          <!-- Sistema 3: MENTE/EMOCIONAL -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🧠 MENTE</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #155E75;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #155E75; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Breve evaluación: estrés, estado de ánimo, bienestar emocional, claridad mental]
            </p>
          </div>

          <!-- Sistema 4: HORMONAL -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🔬 HORMONAL</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #ec4899;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #ec4899; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Breve evaluación: señales hormonales, tiroides, ciclo, libido, peso]
            </p>
          </div>

          <!-- Sistema 5: INMUNE -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🛡️ INMUNE</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #10b981;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #10b981; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Breve evaluación: frecuencia de infecciones, recuperación, inflamación]
            </p>
          </div>

          <!-- Sistema 6: ESTRUCTURA/MOVIMIENTO -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🏃 ESTRUCTURA</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #06b6d4;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #06b6d4; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Breve evaluación: actividad física, dolor musculoesquelético, movilidad]
            </p>
          </div>

        </div>

        <!-- Interpretación General -->
        <div style="margin-top: 1.5rem; padding: 1rem; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 0.5rem 0; color: #92400e; font-size: 0.875rem; font-weight: 600;">💡 INTERPRETACIÓN GENERAL:</h4>
          <p style="margin: 0; font-size: 0.875rem; color: #78350f; line-height: 1.6;">
            [Análisis de los sistemas más comprometidos, interrelaciones entre sistemas, y enfoque prioritario recomendado. Ejemplo: "El sistema digestivo (4/10) está afectando la energía (5/10) y el estado inmune (6/10). Priorizar salud intestinal podría tener efecto cascada positivo."]
          </p>
        </div>
      </div>

      <!-- SECCIÓN 2: RESUMEN EJECUTIVO -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px;">
        <h2 style="color: #b45309; margin-bottom: 1rem;">📋 Resumen Ejecutivo (5-7 Hallazgos Clave)</h2>
        <ol style="line-height: 1.8;">
          <li><strong>[Hallazgo más importante #1]</strong></li>
          <li><strong>[Hallazgo más importante #2]</strong></li>
          <li><strong>[Hallazgo más importante #3]</strong></li>
          <li><strong>[Hallazgo más importante #4]</strong></li>
          <li><strong>[Hallazgo más importante #5]</strong></li>
        </ol>
      </div>

      <!-- SECCIÓN 3: SOAP COMPLETO -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; border: 2px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #059669; margin-bottom: 1rem;">🩺 Análisis Clínico (SOAP)</h2>

        <h3 style="color: #047857; margin-top: 1.5rem;">S - SUBJETIVO (Lo que el paciente reporta)</h3>
        <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem;">
          <strong style="color: #dc2626;">⚠️ ALERGIAS:</strong> [Medicamentos/Alimentos/Ambientales reportados o "NKDA - Sin alergias conocidas"]
        </div>
        <ul style="line-height: 1.8;">
          <li><strong>Síntomas principales:</strong> [Lista detallada con intensidad 0-10 si mencionado]</li>
          <li><strong>Factores desencadenantes:</strong> [Qué empeora los síntomas]</li>
          <li><strong>Factores aliviantes:</strong> [Qué mejora los síntomas]</li>
          <li><strong>Impacto en vida diaria:</strong> [Cómo afecta trabajo, relaciones, sueño]</li>
          <li><strong>Historia temporal:</strong> [Evolución de síntomas en el tiempo]</li>
        </ul>

        <h3 style="color: #047857; margin-top: 1.5rem;">O - OBJETIVO (Datos observables y medibles)</h3>
        <ul style="line-height: 1.8;">
          <li><strong>Hábitos intestinales:</strong> [Frecuencia, Bristol X/7 si mencionado, regularidad]</li>
          <li><strong>Calidad de sueño:</strong> [Horas, interrupciones, calidad X/10 si mencionado]</li>
          <li><strong>Nivel de energía:</strong> [Promedio X/10 si mencionado, patrones diarios]</li>
          <li><strong>Nivel de estrés:</strong> [X/10 si mencionado, fuentes principales]</li>
          <li><strong>Actividad física:</strong> [Tipo, frecuencia, intensidad]</li>
          <li><strong>Consumo actual:</strong> [Alcohol, cafeína, tabaco - frecuencia/cantidad]</li>
          <li><strong>Medicación/Suplementos:</strong> [Lista completa con dosis]</li>
        </ul>

        <h3 style="color: #047857; margin-top: 1.5rem;">A - ASSESSMENT (Evaluación e impresión clínica)</h3>
        <ul style="line-height: 1.8;">
          <li><strong>Impresión diagnóstica:</strong> [Posibles causas basadas en síntomas]</li>
          <li><strong>Factores contribuyentes identificados:</strong>
            <ul>
              <li>Alimentación: [Análisis específico]</li>
              <li>Estrés: [Análisis específico]</li>
              <li>Sueño: [Análisis específico]</li>
              <li>Actividad física: [Análisis específico]</li>
              <li>Exposición ambiental: [Análisis específico]</li>
            </ul>
          </li>
          <li><strong>Áreas de riesgo:</strong> [Factores de riesgo identificados]</li>
          <li><strong>Fortalezas del paciente:</strong> [Recursos y hábitos positivos]</li>
        </ul>

        <h3 style="color: #047857; margin-top: 1.5rem;">P - PLAN (Recomendaciones priorizadas)</h3>

        <h4 style="color: #dc2626; margin-top: 1rem;">🎯 Prioridad ALTA (Implementar inmediatamente):</h4>
        <ol style="line-height: 1.8;">
          <li>[Recomendación específica #1 con razón clara]</li>
          <li>[Recomendación específica #2 con razón clara]</li>
          <li>[Recomendación específica #3 con razón clara]</li>
        </ol>

        <h4 style="color: #f59e0b; margin-top: 1rem;">📅 Prioridad MEDIA (Implementar en 2-4 semanas):</h4>
        <ol style="line-height: 1.8;">
          <li>[Recomendación #1]</li>
          <li>[Recomendación #2]</li>
        </ol>

        <h4 style="color: #0F766E; margin-top: 1rem;">💡 Prioridad BAJA (Considerar después de 1 mes):</h4>
        <ol style="line-height: 1.8;">
          <li>[Recomendación #1]</li>
          <li>[Recomendación #2]</li>
        </ol>

        <h4 style="color: #7c3aed; margin-top: 1rem;">🔬 Estudios/Tests sugeridos:</h4>
        <ul style="line-height: 1.8;">
          <li>[Test #1: Razón específica]</li>
          <li>[Test #2: Razón específica]</li>
        </ul>

        <h4 style="color: #059669; margin-top: 1rem;">📆 Plan de seguimiento:</h4>
        <ul style="line-height: 1.8;">
          <li><strong>Próxima consulta:</strong> [Timeframe recomendado basado en severidad]</li>
          <li><strong>Monitoreo:</strong> [Qué síntomas/métricas trackear diariamente]</li>
          <li><strong>Signos de alarma:</strong> [Cuándo buscar atención urgente]</li>
        </ul>
      </div>

      <!-- SECCIÓN 4: MOTIVACIÓN AL CAMBIO -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
        <h2 style="color: #b45309; margin-bottom: 1rem;">🎯 Análisis de Motivación (MITI 4.2.1)</h2>

        <h3 style="margin-top: 1rem;">Puntuaciones de Disposición (1-10):</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
          <tr><td style="padding: 0.5rem; font-weight: 600;">Importancia del cambio:</td><td style="padding: 0.5rem;">[X/10]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">Confianza en cambiar:</td><td style="padding: 0.5rem;">[X/10]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">Readiness general:</td><td style="padding: 0.5rem;">[X/10]</td></tr>
        </table>

        <h3 style="margin-top: 1.5rem;">Señales de Discurso de Cambio (DARNCAT):</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>D</strong>eseo:</td><td style="padding: 0.5rem;">[Citas del paciente mostrando deseo]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>A</strong>bilidad:</td><td style="padding: 0.5rem;">[Habilidades/recursos que menciona]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>R</strong>azones:</td><td style="padding: 0.5rem;">[Razones para cambiar]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>N</strong>ecesidad:</td><td style="padding: 0.5rem;">[Necesidades expresadas]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>C</strong>ommitment:</td><td style="padding: 0.5rem;">[Compromisos verbales]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>A</strong>ctivación:</td><td style="padding: 0.5rem;">[Pasos considerados]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>T</strong>omar pasos:</td><td style="padding: 0.5rem;">[Acciones ya iniciadas]</td></tr>
        </table>

        <h3 style="margin-top: 1.5rem;">Clasificación Motivacional:</h3>
        <div style="padding: 1rem; background: white; border-radius: 8px; margin-top: 0.5rem;">
          <p style="font-size: 1.25rem; font-weight: 700; color: #059669;"><strong>MOTIVACIÓN: [ALTA/MEDIA/BAJA]</strong></p>
          <p><strong>Razón:</strong> [Explicación detallada basada en scores y DARNCAT]</p>
          <p><strong>Estrategia recomendada:</strong> [Cómo trabajar con este nivel de motivación]</p>
        </div>

        <h3 style="margin-top: 1.5rem;">Áreas de Cambio Prioritarias (por motivación):</h3>
        <ol style="line-height: 1.8;">
          <li><strong>[Área #1]</strong> - Motivación: X/10 - [Razón de prioridad]</li>
          <li><strong>[Área #2]</strong> - Motivación: X/10 - [Razón de prioridad]</li>
          <li><strong>[Área #3]</strong> - Motivación: X/10 - [Razón de prioridad]</li>
        </ol>

        <!-- ANÁLISIS DE ADHERENCIA POTENCIAL - CRÍTICO PARA FILTRAR PACIENTES -->
        <h3 style="margin-top: 2rem; color: #dc2626;">🚨 ANÁLISIS DE ADHERENCIA POTENCIAL</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; background: white; border-radius: 8px;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 0.75rem; font-weight: 600; width: 40%;">Intentos previos de cambio:</td>
            <td style="padding: 0.75rem;">[Descripción de intentos previos o "No reportado"]</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 0.75rem; font-weight: 600;">Barreras identificadas:</td>
            <td style="padding: 0.75rem;">[Lista de obstáculos: tiempo, familia, trabajo, dinero, etc.]</td>
          </tr>
          <tr>
            <td style="padding: 0.75rem; font-weight: 600;">Red Flags de NO-adherencia:</td>
            <td style="padding: 0.75rem;">[Lista o "Ninguno detectado"]</td>
          </tr>
        </table>

        <div style="margin-top: 1rem; padding: 0.5rem; background: #fef2f2; border-radius: 4px; font-size: 0.85rem;">
          <strong>Red Flags a detectar:</strong>
          ❌ Múltiples intentos fallidos sin reflexión |
          ❌ Culpa externa ("no tengo tiempo", "es por el trabajo") |
          ❌ Expectativas mágicas ("quiero algo rápido") |
          ❌ Baja autoeficacia ("no soy capaz") |
          ❌ Ambiente no favorable (familia sabotea) |
          ❌ Adicciones no controladas
        </div>

        <!-- CLASIFICACIÓN AUTOMÁTICA DEL PACIENTE -->
        <div id="pronostico-adherencia" style="margin-top: 1.5rem; padding: 1.25rem; border-radius: 12px; text-align: center;">
          <!-- El color del fondo depende del pronóstico:
               🟢 CANDIDATO IDEAL: background: #dcfce7; border: 3px solid #22c55e;
               🟡 CON RESERVAS: background: #fef9c3; border: 3px solid #eab308;
               🔴 NO CANDIDATO: background: #fee2e2; border: 3px solid #ef4444;
          -->
          <p style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">PRONÓSTICO DE ADHERENCIA</p>
          <p style="font-size: 1.75rem; font-weight: 800; margin: 0.5rem 0;">
            [🟢 CANDIDATO IDEAL / 🟡 CON RESERVAS / 🔴 NO CANDIDATO ACTUAL]
          </p>
          <p style="margin-top: 0.75rem;"><strong>Razón:</strong> [Justificación basada en Readiness + Red Flags]</p>
          <p style="margin-top: 0.5rem; font-style: italic; color: #6b7280;">
            <strong>Recomendación:</strong> [Qué hacer con este paciente: invertir en plan completo / empezar pequeño / derivar a coaching primero]
          </p>
        </div>

        <div style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; font-size: 0.85rem;">
          <strong>Criterios de clasificación:</strong><br>
          🟢 <strong>CANDIDATO IDEAL</strong>: Readiness ≥7 Y sin red flags → Alta probabilidad de adherencia<br>
          🟡 <strong>CON RESERVAS</strong>: Readiness 4-6 O 1-2 red flags → Empezar con cambios pequeños<br>
          🔴 <strong>NO CANDIDATO</strong>: Readiness &lt;4 O 3+ red flags → Derivar a coaching/psicología primero
        </div>
      </div>

      <!-- SECCIÓN 5: CHECKLIST DE ÁREAS CORE -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px;">
        <h2 style="color: #047857; margin-bottom: 1rem;">✅ Checklist de Áreas Core Cubiertas (20/20)</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 0.5rem;">✅ 1. Motivo y objetivos principales</td><td style="padding: 0.5rem; font-weight: 600;">[✓ Sí / ⚠ Parcial / ✗ No]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 2. Línea de tiempo</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 3. Síntomas digestivos</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 4. Hábitos intestinales</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 5. Sensibilidades alimentarias</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 6. Día típico de alimentación</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 7. Ultraprocesados</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 8. Fibra y fermentados</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 9. Sueño</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 10. Energía diaria</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 11. Estrés</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 12. Actividad física</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 13. Exposición ambiental</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 14. Hábitos de consumo</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 15. Medicación/Suplementos</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 16. Antecedentes médicos</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 17. Inmunidad</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 18. Señales hormonales</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 19. Bienestar emocional</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 20. Información adicional</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
        </table>
        <p style="margin-top: 1rem;"><strong>Áreas Completamente Cubiertas:</strong> [X/20]</p>
        <p><strong>Áreas Faltantes:</strong> [Lista específica]</p>
      </div>

      <!-- SECCIÓN 6: NOTAS ADICIONALES -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px;">
        <h2 style="color: #991b1b; margin-bottom: 1rem;">📝 Notas Adicionales del Clínico</h2>
        <ul style="line-height: 1.8;">
          <li><strong>Barreras identificadas:</strong> [Obstáculos para el cambio]</li>
          <li><strong>Recursos disponibles:</strong> [Apoyos del paciente - familia, tiempo, finanzas]</li>
          <li><strong>Consideraciones especiales:</strong> [Contexto cultural, preferencias, limitaciones]</li>
        </ul>
      </div>

    </div>

    ---
    TRANSCRIPCIÓN COMPLETA:
    ${transcript}
    ---

    INSTRUCCIONES CRÍTICAS:
    1. Sé EXHAUSTIVO y ESPECÍFICO en cada sección - usa datos concretos de la transcripción
    2. USA números, escalas y frecuencias cuando estén disponibles
    3. Prioriza recomendaciones basadas en IMPACTO clínico y FACTIBILIDAD para el paciente
    4. Marca claramente en el checklist: ✓ (cubierto completamente), ⚠ (parcial), ✗ (no cubierto)
    5. El resumen debe ser tan COMPLETO que el médico pueda tomar decisiones sin leer la transcripción
    6. Incluye el score "Readiness general: [X/10]" en la sección de motivación para el filtro automático

    7. **DASHBOARD VISUAL - LLENAR CON DATOS REALES:**
       - Alertas Críticas: Contar el número de RED FLAGS detectados (dolor ≥7/10, sangre, pérdida peso, etc.)
       - Completitud: Contar cuántas de las 20 áreas fueron cubiertas completamente (ej: "15/20")
       - Motivación: Usar el score de Readiness general (ej: "8/10")
       - Duración: Calcular duración aproximada de la entrevista en minutos
       - Red Flags: Listar TODOS los signos de alarma detectados con formato ⚠️. Si no hay, escribir "✅ No se detectaron alertas críticas"
       - Barras de progreso: Reemplazar [X] con el número exacto (ej: si Importancia es 8/10, el width debe ser "width: 80%")

    8. **MATRIZ DE SISTEMAS - EVALUAR Y PUNTUAR (MUY IMPORTANTE):**
       🚨 CRÍTICO: Debes REEMPLAZAR cada "[X/10]" con un NÚMERO REAL del 0 al 10.

       Evalúa cada sistema basado en la información recopilada:
       - 🍽️ DIGESTIÓN: Síntomas digestivos, hábitos intestinales, sensibilidades alimentarias
       - ⚡ ENERGÍA: Nivel energético diario, calidad de sueño, fatiga
       - 🧠 MENTE: Nivel de estrés, estado de ánimo, bienestar emocional
       - 🔬 HORMONAL: Señales hormonales, ciclo menstrual, libido, cambios de peso
       - 🛡️ INMUNE: Frecuencia de infecciones, tiempo de recuperación, inflamación
       - 🏃 ESTRUCTURA: Actividad física, dolor musculoesquelético, movilidad

       EJEMPLO DE REEMPLAZO CORRECTO:
       ❌ INCORRECTO: <span>[X/10]</span>  ← NO dejes el placeholder
       ✅ CORRECTO:   <span>7/10</span>    ← Reemplaza con número real

       También ajusta el width de la barra de progreso: score 7/10 → width="70%"

       En "Interpretación General": Analizar interrelaciones entre sistemas y priorizar el enfoque más impactante`,
  en: (transcript: string) => `
    You are an expert medical AI analyst specialized in Functional Medicine and Motivational Interviewing.
    Analyze the complete transcript and generate a COMPREHENSIVE PROFESSIONAL MEDICAL REPORT.

    ## REQUIRED STRUCTURE (Professional HTML):

    <div class="medical-report" style="font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto;">

      <!-- SECTION 1: PATIENT INFORMATION -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-left: 4px solid #0F766E; border-radius: 8px;">
        <h2 style="color: #0F766E; margin-bottom: 1rem;">👤 Patient Information</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 0.5rem; font-weight: 600;">Primary reason for consultation:</td><td style="padding: 0.5rem;">[Brief specific description]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">Patient's objectives:</td><td style="padding: 0.5rem;">[List of mentioned goals]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">Duration of symptoms:</td><td style="padding: 0.5rem;">[Time since onset]</td></tr>
        </table>
      </div>

      <!-- VISUAL DASHBOARD -->
      <div class="dashboard" style="margin-bottom: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #0F766E 0%, #155E75 100%); border-radius: 12px; color: white;">
        <h2 style="color: white; margin-bottom: 1.5rem; font-size: 1.5rem;">📊 Quick View - Clinical Dashboard</h2>

        <!-- Key Metrics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">🚨 Critical Alerts</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X]</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">📋 Completeness</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X/20]</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">💪 Motivation</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X/10]</div>
          </div>
          <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; opacity: 0.9;">⏱️ Duration</div>
            <div style="font-size: 2rem; font-weight: 700; margin-top: 0.5rem;">[X min]</div>
          </div>
        </div>

        <!-- Red Flags (Only if they exist) -->
        <div style="background: rgba(239, 68, 68, 0.95); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <h3 style="margin: 0 0 0.75rem 0; color: white; font-size: 1.125rem;">🔴 URGENT ALERTS - Review Immediately</h3>
          <ul style="margin: 0; padding-left: 1.5rem; line-height: 1.8;">
            [IF RED FLAGS EXIST: list them here with format: ⚠️ Red flag description]
            [IF NONE: write "✅ No critical alerts detected"]
          </ul>
        </div>

        <!-- Motivational Progress Bars -->
        <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px;">
          <h3 style="margin: 0 0 1rem 0; font-size: 1rem;">💪 Readiness to Change</h3>
          <div style="margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="font-size: 0.875rem;">Importance</span>
              <span style="font-size: 0.875rem; font-weight: 700;">[X/10]</span>
            </div>
            <div style="background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: #10b981; height: 100%; width: [X]0%;"></div>
            </div>
          </div>
          <div style="margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="font-size: 0.875rem;">Confidence</span>
              <span style="font-size: 0.875rem; font-weight: 700;">[X/10]</span>
            </div>
            <div style="background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: #0F766E; height: 100%; width: [X]0%;"></div>
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="font-size: 0.875rem;">Readiness</span>
              <span style="font-size: 0.875rem; font-weight: 700;">[X/10]</span>
            </div>
            <div style="background: rgba(0,0,0,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background: #f59e0b; height: 100%; width: [X]0%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- SYSTEMS MATRIX (FUNCTIONAL MEDICINE MATRIX) -->
      <div class="systems-matrix" style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-left: 4px solid #0F766E; border-radius: 8px;">
        <h2 style="color: #0F766E; margin-bottom: 1.5rem; font-size: 1.5rem;">🔬 Systems Matrix - Functional Medicine</h2>
        <p style="color: #64748b; margin-bottom: 1.5rem; font-size: 0.875rem;">Evaluation of main body systems status (scale 0-10, where 10 is optimal)</p>

        <!-- Grid of 6 Systems -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">

          <!-- System 1: DIGESTION -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🍽️ DIGESTION</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #0F766E;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #0F766E; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Brief assessment: digestive symptoms, bowel habits, sensitivities]
            </p>
          </div>

          <!-- System 2: ENERGY -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">⚡ ENERGY</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #f59e0b; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Brief assessment: daily energy level, sleep, fatigue, mitochondrial]
            </p>
          </div>

          <!-- System 3: MIND/EMOTIONAL -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🧠 MIND</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #155E75;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #155E75; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Brief assessment: stress, mood, emotional wellbeing, mental clarity]
            </p>
          </div>

          <!-- System 4: HORMONAL -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🔬 HORMONAL</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #ec4899;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #ec4899; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Brief assessment: hormonal signals, thyroid, cycle, libido, weight]
            </p>
          </div>

          <!-- System 5: IMMUNE -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🛡️ IMMUNE</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #10b981;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #10b981; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Brief assessment: infection frequency, recovery, inflammation]
            </p>
          </div>

          <!-- System 6: STRUCTURE/MOVEMENT -->
          <div style="background: white; border-radius: 8px; padding: 1rem; border: 2px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h3 style="margin: 0; color: #0f172a; font-size: 1rem;">🏃 STRUCTURE</h3>
              <span style="font-size: 1.5rem; font-weight: 700; color: #06b6d4;">[X/10]</span>
            </div>
            <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;">
              <div style="background: #06b6d4; height: 100%; width: [X]0%;"></div>
            </div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">
              [Brief assessment: physical activity, musculoskeletal pain, mobility]
            </p>
          </div>

        </div>

        <!-- General Interpretation -->
        <div style="margin-top: 1.5rem; padding: 1rem; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 0.5rem 0; color: #92400e; font-size: 0.875rem; font-weight: 600;">💡 GENERAL INTERPRETATION:</h4>
          <p style="margin: 0; font-size: 0.875rem; color: #78350f; line-height: 1.6;">
            [Analysis of most compromised systems, system interrelations, and recommended priority focus. Example: "The digestive system (4/10) is affecting energy (5/10) and immune status (6/10). Prioritizing gut health could have a positive cascade effect."]
          </p>
        </div>
      </div>

      <!-- SECTION 2: EXECUTIVE SUMMARY -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px;">
        <h2 style="color: #b45309; margin-bottom: 1rem;">📋 Executive Summary (5-7 Key Findings)</h2>
        <ol style="line-height: 1.8;">
          <li><strong>[Most important finding #1]</strong></li>
          <li><strong>[Most important finding #2]</strong></li>
          <li><strong>[Most important finding #3]</strong></li>
          <li><strong>[Most important finding #4]</strong></li>
          <li><strong>[Most important finding #5]</strong></li>
        </ol>
      </div>

      <!-- SECTION 3: COMPLETE SOAP -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; border: 2px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #059669; margin-bottom: 1rem;">🩺 Clinical Analysis (SOAP)</h2>

        <h3 style="color: #047857; margin-top: 1.5rem;">S - SUBJECTIVE (What the patient reports)</h3>
        <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem;">
          <strong style="color: #dc2626;">⚠️ ALLERGIES:</strong> [Medications/Foods/Environmental reported or "NKDA - No Known Drug Allergies"]
        </div>
        <ul style="line-height: 1.8;">
          <li><strong>Primary symptoms:</strong> [Detailed list with intensity 0-10 if mentioned]</li>
          <li><strong>Triggering factors:</strong> [What worsens symptoms]</li>
          <li><strong>Alleviating factors:</strong> [What improves symptoms]</li>
          <li><strong>Impact on daily life:</strong> [How it affects work, relationships, sleep]</li>
          <li><strong>Temporal history:</strong> [Evolution of symptoms over time]</li>
        </ul>

        <h3 style="color: #047857; margin-top: 1.5rem;">O - OBJECTIVE (Observable and measurable data)</h3>
        <ul style="line-height: 1.8;">
          <li><strong>Bowel habits:</strong> [Frequency, Bristol X/7 if mentioned, regularity]</li>
          <li><strong>Sleep quality:</strong> [Hours, interruptions, quality X/10 if mentioned]</li>
          <li><strong>Energy level:</strong> [Average X/10 if mentioned, daily patterns]</li>
          <li><strong>Stress level:</strong> [X/10 if mentioned, primary sources]</li>
          <li><strong>Physical activity:</strong> [Type, frequency, intensity]</li>
          <li><strong>Current consumption:</strong> [Alcohol, caffeine, tobacco - frequency/amount]</li>
          <li><strong>Medication/Supplements:</strong> [Complete list with doses]</li>
        </ul>

        <h3 style="color: #047857; margin-top: 1.5rem;">A - ASSESSMENT (Evaluation and clinical impression)</h3>
        <ul style="line-height: 1.8;">
          <li><strong>Diagnostic impression:</strong> [Possible causes based on symptoms]</li>
          <li><strong>Contributing factors identified:</strong>
            <ul>
              <li>Nutrition: [Specific analysis]</li>
              <li>Stress: [Specific analysis]</li>
              <li>Sleep: [Specific analysis]</li>
              <li>Physical activity: [Specific analysis]</li>
              <li>Environmental exposure: [Specific analysis]</li>
            </ul>
          </li>
          <li><strong>Risk areas:</strong> [Identified risk factors]</li>
          <li><strong>Patient strengths:</strong> [Resources and positive habits]</li>
        </ul>

        <h3 style="color: #047857; margin-top: 1.5rem;">P - PLAN (Prioritized recommendations)</h3>

        <h4 style="color: #dc2626; margin-top: 1rem;">🎯 HIGH Priority (Implement immediately):</h4>
        <ol style="line-height: 1.8;">
          <li>[Specific recommendation #1 with clear reason]</li>
          <li>[Specific recommendation #2 with clear reason]</li>
          <li>[Specific recommendation #3 with clear reason]</li>
        </ol>

        <h4 style="color: #f59e0b; margin-top: 1rem;">📅 MEDIUM Priority (Implement in 2-4 weeks):</h4>
        <ol style="line-height: 1.8;">
          <li>[Recommendation #1]</li>
          <li>[Recommendation #2]</li>
        </ol>

        <h4 style="color: #0F766E; margin-top: 1rem;">💡 LOW Priority (Consider after 1 month):</h4>
        <ol style="line-height: 1.8;">
          <li>[Recommendation #1]</li>
          <li>[Recommendation #2]</li>
        </ol>

        <h4 style="color: #7c3aed; margin-top: 1rem;">🔬 Suggested Studies/Tests:</h4>
        <ul style="line-height: 1.8;">
          <li>[Test #1: Specific reason]</li>
          <li>[Test #2: Specific reason]</li>
        </ul>

        <h4 style="color: #059669; margin-top: 1rem;">📆 Follow-up Plan:</h4>
        <ul style="line-height: 1.8;">
          <li><strong>Next consultation:</strong> [Recommended timeframe based on severity]</li>
          <li><strong>Monitoring:</strong> [What symptoms/metrics to track daily]</li>
          <li><strong>Warning signs:</strong> [When to seek urgent care]</li>
        </ul>
      </div>

      <!-- SECTION 4: CHANGE MOTIVATION -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
        <h2 style="color: #b45309; margin-bottom: 1rem;">🎯 Motivation Analysis (MITI 4.2.1)</h2>

        <h3 style="margin-top: 1rem;">Readiness Scores (1-10):</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
          <tr><td style="padding: 0.5rem; font-weight: 600;">Importance of change:</td><td style="padding: 0.5rem;">[X/10]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">Confidence in changing:</td><td style="padding: 0.5rem;">[X/10]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;">General readiness:</td><td style="padding: 0.5rem;">[X/10]</td></tr>
        </table>

        <h3 style="margin-top: 1.5rem;">Change Talk Signals (DARNCAT):</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>D</strong>esire:</td><td style="padding: 0.5rem;">[Patient quotes showing desire]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>A</strong>bility:</td><td style="padding: 0.5rem;">[Skills/resources mentioned]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>R</strong>easons:</td><td style="padding: 0.5rem;">[Reasons for changing]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>N</strong>eed:</td><td style="padding: 0.5rem;">[Expressed needs]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>C</strong>ommitment:</td><td style="padding: 0.5rem;">[Verbal commitments]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>A</strong>ctivation:</td><td style="padding: 0.5rem;">[Steps considered]</td></tr>
          <tr><td style="padding: 0.5rem; font-weight: 600;"><strong>T</strong>aking steps:</td><td style="padding: 0.5rem;">[Actions already initiated]</td></tr>
        </table>

        <h3 style="margin-top: 1.5rem;">Motivational Classification:</h3>
        <div style="padding: 1rem; background: white; border-radius: 8px; margin-top: 0.5rem;">
          <p style="font-size: 1.25rem; font-weight: 700; color: #059669;"><strong>MOTIVATION: [HIGH/MEDIUM/LOW]</strong></p>
          <p><strong>Reason:</strong> [Detailed explanation based on scores and DARNCAT]</p>
          <p><strong>Recommended strategy:</strong> [How to work with this motivation level]</p>
        </div>

        <h3 style="margin-top: 1.5rem;">Priority Change Areas (by motivation):</h3>
        <ol style="line-height: 1.8;">
          <li><strong>[Area #1]</strong> - Motivation: X/10 - [Priority reason]</li>
          <li><strong>[Area #2]</strong> - Motivation: X/10 - [Priority reason]</li>
          <li><strong>[Area #3]</strong> - Motivation: X/10 - [Priority reason]</li>
        </ol>

        <!-- POTENTIAL ADHERENCE ANALYSIS - CRITICAL FOR PATIENT FILTERING -->
        <h3 style="margin-top: 2rem; color: #dc2626;">🚨 Potential Adherence Analysis</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; background: white; border-radius: 8px;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 0.75rem; font-weight: 600; width: 40%;">Previous change attempts:</td>
            <td style="padding: 0.75rem;">[Description of previous attempts or "Not reported"]</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 0.75rem; font-weight: 600;">Identified barriers:</td>
            <td style="padding: 0.75rem;">[List of obstacles: time, family, work, money, etc.]</td>
          </tr>
          <tr>
            <td style="padding: 0.75rem; font-weight: 600;">NON-adherence Red Flags:</td>
            <td style="padding: 0.75rem;">[List or "None detected"]</td>
          </tr>
        </table>

        <div style="margin-top: 1rem; padding: 0.75rem; background: #fef2f2; border-radius: 8px; font-size: 0.85rem;">
          <strong>Red Flags to detect (mark if applicable):</strong><br>
          ❌ Multiple failed attempts without reflecting on causes<br>
          ❌ External blame for health problems ("it's because of work", "I don't have time")<br>
          ❌ Magical expectations ("I want a pill/quick fix")<br>
          ❌ Cannot identify personal benefits of change<br>
          ❌ Low self-efficacy ("I'm not capable", "I always fail")<br>
          ❌ Unfavorable environment (partner/family who sabotages)<br>
          ❌ Uncontrolled addictions (alcohol, tobacco, sugar)<br>
          ❌ Resistance to previous recommendations
        </div>

        <!-- AUTOMATIC PATIENT CLASSIFICATION -->
        <div id="adherence-prognosis" style="margin-top: 1.5rem; padding: 1.25rem; border-radius: 12px; text-align: center; background: linear-gradient(135deg, #fef3c7, #fde68a);">
          <p style="font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem;">ADHERENCE PROGNOSIS</p>
          <p style="font-size: 1.75rem; font-weight: 800; margin: 0.5rem 0;">
            [🟢 IDEAL CANDIDATE / 🟡 WITH RESERVATIONS / 🔴 NOT A CANDIDATE NOW]
          </p>
          <p style="margin-top: 0.75rem;"><strong>Reason:</strong> [Justification based on Readiness + Red Flags]</p>
          <p style="margin-top: 0.5rem; font-style: italic; color: #6b7280;">
            <strong>Recommendation:</strong> [What to do with this patient: invest in complete plan / start small / refer to coaching first]
          </p>
        </div>

        <div style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; font-size: 0.85rem;">
          <strong>Classification criteria:</strong><br>
          🟢 <strong>IDEAL CANDIDATE</strong>: Readiness ≥7 AND no red flags → High adherence probability<br>
          🟡 <strong>WITH RESERVATIONS</strong>: Readiness 4-6 OR 1-2 red flags → Start with small changes<br>
          🔴 <strong>NOT A CANDIDATE</strong>: Readiness &lt;4 OR 3+ red flags → Refer to coaching/psychology first
        </div>
      </div>

      <!-- SECTION 5: CORE AREAS CHECKLIST -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #f0fdf4; border-left: 4px solid #059669; border-radius: 8px;">
        <h2 style="color: #047857; margin-bottom: 1rem;">✅ Core Areas Coverage Checklist (20/20)</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 0.5rem;">✅ 1. Main reason and objectives</td><td style="padding: 0.5rem; font-weight: 600;">[✓ Yes / ⚠ Partial / ✗ No]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 2. Timeline</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 3. Digestive symptoms</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 4. Bowel habits</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 5. Food sensitivities</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 6. Typical day of eating</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 7. Ultra-processed foods</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 8. Fiber and fermented foods</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 9. Sleep</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 10. Daily energy</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 11. Stress</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 12. Physical activity</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 13. Environmental exposure</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 14. Consumption habits</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 15. Medication/Supplements</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 16. Medical history</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 17. Immunity</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 18. Hormonal signals</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 19. Emotional wellbeing</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
          <tr><td style="padding: 0.5rem;">✅ 20. Additional information</td><td style="padding: 0.5rem; font-weight: 600;">[✓/⚠/✗]</td></tr>
        </table>
        <p style="margin-top: 1rem;"><strong>Fully Covered Areas:</strong> [X/20]</p>
        <p><strong>Missing Areas:</strong> [Specific list]</p>
      </div>

      <!-- SECTION 6: ADDITIONAL NOTES -->
      <div class="section" style="margin-bottom: 2rem; padding: 1.5rem; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px;">
        <h2 style="color: #991b1b; margin-bottom: 1rem;">📝 Additional Clinical Notes</h2>
        <ul style="line-height: 1.8;">
          <li><strong>Barriers identified:</strong> [Obstacles to change]</li>
          <li><strong>Available resources:</strong> [Patient support - family, time, finances]</li>
          <li><strong>Special considerations:</strong> [Cultural context, preferences, limitations]</li>
        </ul>
      </div>

    </div>

    ---
    COMPLETE TRANSCRIPT:
    ${transcript}
    ---

    CRITICAL INSTRUCTIONS:
    1. Be EXHAUSTIVE and SPECIFIC in each section - use concrete data from the transcript
    2. USE numbers, scales, and frequencies when available
    3. Prioritize recommendations based on CLINICAL IMPACT and FEASIBILITY for the patient
    4. Clearly mark in the checklist: ✓ (fully covered), ⚠ (partial), ✗ (not covered)
    5. The summary must be so COMPLETE that the doctor can make decisions without reading the transcript
    6. Include the "General readiness: [X/10]" score in the motivation section for automatic filtering

    7. **VISUAL DASHBOARD - FILL WITH REAL DATA:**
       - Critical Alerts: Count the number of RED FLAGS detected (pain ≥7/10, blood, weight loss, etc.)
       - Completeness: Count how many of the 20 areas were fully covered (e.g. "15/20")
       - Motivation: Use the General readiness score (e.g. "8/10")
       - Duration: Calculate approximate interview duration in minutes
       - Red Flags: List ALL warning signs detected with ⚠️ format. If none, write "✅ No critical alerts detected"
       - Progress bars: Replace [X] with exact number (e.g. if Importance is 8/10, width should be "width: 80%")

    8. **SYSTEMS MATRIX - EVALUATE AND SCORE (VERY IMPORTANT):**
       🚨 CRITICAL: You MUST REPLACE each "[X/10]" with a REAL NUMBER from 0 to 10.

       Evaluate each system based on collected information:
       - 🍽️ DIGESTION: Digestive symptoms, bowel habits, food sensitivities
       - ⚡ ENERGY: Daily energy level, sleep quality, fatigue
       - 🧠 MIND: Stress level, mood, emotional wellbeing
       - 🔬 HORMONAL: Hormonal signals, menstrual cycle, libido, weight changes
       - 🛡️ IMMUNE: Infection frequency, recovery time, inflammation
       - 🏃 STRUCTURE: Physical activity, musculoskeletal pain, mobility

       CORRECT REPLACEMENT EXAMPLE:
       ❌ WRONG: <span>[X/10]</span>  ← Do NOT leave the placeholder
       ✅ RIGHT: <span>7/10</span>    ← Replace with actual number

       Also adjust the progress bar width: score 7/10 → width="70%"

       In "General Interpretation": Analyze system interrelations and prioritize most impactful focus`
};
