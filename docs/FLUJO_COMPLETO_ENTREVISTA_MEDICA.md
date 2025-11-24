# 📋 FLUJO COMPLETO DE LA ENTREVISTA MÉDICA - CABO HEALTH NOVA

## 🎯 Resumen Ejecutivo

Cabo Health Nova es una aplicación de entrevista médica con IA que utiliza **Entrevista Motivacional** para evaluar tanto la condición médica del paciente como su disposición para cambiar hábitos de salud. El sistema genera un resumen dual que incluye análisis clínico SOAP + evaluación de motivación para el cambio.

---

## 🔄 FLUJO COMPLETO DEL PROCESO

### 1. INICIO DE SESIÓN

**Usuario**: Paciente registrado
**Acción**: Click en "Iniciar Sesión"
**Sistema**:
- Verifica HTTPS (requerido para micrófono)
- Solicita permisos de micrófono al navegador
- Conecta con Gemini API usando WebSocket (Multimodal Live API)
- Inicializa AudioWorklet para procesamiento de audio en tiempo real

**Modelo utilizado**: `gemini-2.5-flash-native-audio-preview-09-2025`
- Baja latencia para conversación fluida
- Audio nativo bidireccional

---

## 🎤 2. ENTREVISTA CON IA - NOVA (Entrevisadora Motivacional)

### 2.1 Protocolo de Apertura

**Nova (IA)** comienza con:
```
"Hola, soy Nova, tu entrevistadora médica especializada de Cabo Health.
Mi objetivo es entender profundamente tu situación de salud y evaluar
qué tan motivado/a estás para hacer cambios positivos.

Te haré preguntas detalladas sobre diferentes aspectos de tu vida y salud.
Cuando menciones cualquier síntoma, problema o molestia, investigaremos
juntos los detalles para entender mejor tu situación. Comencemos, por favor."
```

### 2.2 Framework de Entrevista: MITI 4.2.1

Nova está programada para seguir el **Motivational Interviewing Treatment Integrity Code 4.2.1**, que incluye:

#### **OAR - Técnicas Fundamentales:**

1. **Open Questions (Preguntas Abiertas)**
   - "¿Qué te gustaría que fuera diferente en tu vida de salud?"
   - "¿Qué has intentado antes y cómo te fue?"
   - "¿Qué te preocupa más de tu [síntoma]?"

2. **Affirmations (Aseveraciones Positivas)**
   - "Es admirable que busques mejoras en tu salud"
   - "Veo que has sido persistente"
   - "Tu preocupación muestra que te tomas en serio tu bienestar"

3. **Reflections (Reflejos Empáticos)**
   - "Parece que [problema] te está afectando significativamente..."
   - "Entiendo que [mención] es realmente frustrante para ti"
   - "Siento que [síntoma] está limitando tu capacidad para..."

### 2.3 Sistema de Indagación Proactiva

**CRÍTICO**: Nova está programada para **investigar automáticamente** cuando el paciente menciona cualquier problema.

#### Palabras clave que activan indagación profunda:
- dolor, síntoma, problema, molestia, malestar
- cansancio, fatiga, ansiedad, tristeza, insomnio
- hambre intensa, antojos, hinchazón, gases
- dolor de cabeza, mareos, náuseas

#### Secuencia automática de indagación (5 niveles):

**Ejemplo:**
```
Paciente: "Últimamente me siento muy cansado"

Nova (automáticamente profundiza):
1. PROFUNDIZACIÓN: "Cuéntame más sobre ese cansancio. ¿Cuándo comenzó exactamente?"
2. DETALLES: "¿En qué momentos del día lo notas más?"
3. MODULADORES: "¿Qué hace que mejore o empeore?"
4. IMPACTO: "¿Cómo te está afectando en tu vida diaria?"
5. EVOLUCIÓN: "¿Ha ido aumentando o se mantiene igual?"
```

### 2.4 Matriz de Conocimiento - 73 Preguntas Categorizadas

Nova tiene una base de conocimiento estructurada en 11 áreas principales:

1. **Síntomas actuales** - Línea temporal detallada
2. **Hábitos alimentarios** (Q7-Q26) - Dieta, digestión, hidratación
3. **Patrones de sueño** (Q27-Q35) - Calidad, duración, problemas
4. **Bienestar emocional** (Q36-Q40) - Estrés, ansiedad, estado mental
5. **Actividad física** (Q41-Q45) - Ejercicio, recuperación
6. **Exposiciones ambientales** (Q46-Q53) - Toxinas, ambiente laboral
7. **Factores endocrinos** (Q54-Q56) - Hormonas, ciclos
8. **Inmunidad** (Q57-Q60) - Enfermedades frecuentes, inflamación
9. **Historial médico** (Q61-Q66) - Condiciones previas, medicamentos
10. **Hábitos de consumo** (Q67-Q70) - Alcohol, tabaco, sustancias
11. **Historia temprana** (Q71-Q72) - Nacimiento, desarrollo

**Importante**: Nova NO sigue un script rígido. Adapta dinámicamente qué preguntas hacer basándose en las respuestas del paciente.

### 2.5 Evaluación de Disposición al Cambio

Durante la entrevista, Nova evalúa la **motivación real** del paciente para cambiar mediante:

#### Escalas de Evaluación (1-10):

1. **Readiness Ruler (Disposición)**
   - "¿Qué tan listo/a te sientes para hacer cambios en [área]?"
   - Escala: 1 (nada listo) - 10 (completamente listo)

2. **Importance Scale (Importancia)**
   - "¿Qué tan importante es para ti cambiar [aspecto]?"
   - Escala: 1 (nada importante) - 10 (extremadamente importante)

3. **Confidence Scale (Confianza)**
   - "¿Qué tan seguro/a te sientes de poder hacer este cambio?"
   - Escala: 1 (nada confiado) - 10 (muy confiado)

#### DARNCAT - Señales de Discurso de Cambio:

Nova detecta y registra:
- **D**esire (Deseo de cambiar)
- **A**bility (Capacidad percibida)
- **R**eason (Razones para cambiar)
- **N**eed (Necesidad de cambiar)
- **C**ommitment (Compromisos verbalizados)
- **A**ctivation (Activación de cambio)
- **T**aking steps (Pasos tomados)

**Ejemplo de detección:**
```
Paciente: "Creo que necesito empezar a hacer ejercicio,
           porque mi energía está muy baja"

Nova detecta:
- NEED: ✓ ("necesito")
- REASON: ✓ ("porque mi energía está baja")
- ACTIVATION: Pendiente (aún no ha tomado pasos concretos)
```

### 2.6 Protocolo de Cierre

Cuando Nova determina que ha recolectado suficiente información:

```
"Excelente, hemos cubierto aspectos muy importantes de tu salud
y motivación para el cambio. Tu información será muy valiosa para
el equipo clínico. Ahora voy a generar un análisis completo que
incluya tanto los hallazgos médicos como tu nivel de disposición
para adoptar cambios saludables."
```

---

## 🧠 3. PROCESAMIENTO Y GENERACIÓN DEL RESUMEN

### 3.1 Fin de Sesión

**Usuario**: Click en "Finalizar Sesión"
**Sistema**:
- Cierra conexión WebSocket con Gemini
- Detiene captura de audio
- Recopila toda la transcripción

### 3.2 Síntesis con Gemini Pro

**Modelo utilizado**: `gemini-2.5-pro`
- Mayor capacidad de razonamiento
- Ventana de contexto amplia para procesar transcripción completa

**Input al modelo**:
```
TRANSCRIPCIÓN COMPLETA:
---
[Toda la conversación entre paciente y Nova]
---

TAREA:
Genera un análisis dual:
1. Resumen Clínico SOAP
2. Análisis de Motivación para Cambio de Hábitos
```

### 3.3 Estructura del Resumen Generado

El resumen incluye DOS secciones principales:

#### **PARTE 1: 📋 Resumen Clínico (SOAP)**

Formato médico estándar:

**S - Subjetivo**:
- Síntomas reportados por el paciente
- Historia presente de la enfermedad
- Contexto personal relevante

**O - Objetivo**:
- Hallazgos observables durante la entrevista
- Patrones identificados en respuestas
- Datos cuantificables mencionados

**A - Apreciación (Assessment)**:
- Análisis clínico de la situación
- Posibles diagnósticos diferenciales
- Factores de riesgo identificados

**P - Plan**:
- Recomendaciones clínicas
- Estudios sugeridos
- Seguimiento propuesto

#### **PARTE 2: 🎯 Análisis de Motivación para el Cambio**

**Puntuación de Disposición (1-10):**
```
- Importancia percibida del cambio: 7/10
- Confianza en capacidad de cambio: 6/10
- Readiness general: 7/10
```

**Señales de Discurso de Cambio (DARNCAT):**
```
✓ Desire: Expresó deseo de mejorar energía y peso
✓ Ability: Reconoce capacidad para cambiar dieta
✓ Reason: Identifica claramente impacto negativo actual
✓ Need: Siente necesidad urgente de cambio
✓ Commitment: Mencionó disposición a consultar nutricionista
✓ Activation: Está considerando pasos específicos
⚠ Taking steps: Aún no ha iniciado acciones concretas
```

**Filtro de Paciente:**
```
Clasificación: MEDIA-ALTA MOTIVACIONAL

Razón: Paciente muestra alto reconocimiento del problema
(7/10) y buena importancia percibida (7/10), pero confianza
moderada (6/10). Ha verbalizado cambios de conversación
(DARN positivos) pero aún no ha iniciado acciones concretas.

Recomendación: Paciente es buen candidato para intervención.
Requiere apoyo estructurado inicial para construir confianza
y pasar de contemplación a acción. Plan de seguimiento
quincenal recomendado.
```

**Áreas de Cambio Prioritarias:**
```
1. Hábitos de sueño (Motivación: 8/10) - Mayor apertura
2. Alimentación (Motivación: 7/10) - Reconoce necesidad
3. Actividad física (Motivación: 5/10) - Requiere apoyo adicional
```

---

## 📧 4. ENVÍO AL MÉDICO

### 4.1 Botón "Enviar al Médico"

Cuando el resumen está listo, aparece:
```
┌─────────────────────────────┐
│  ✓  Resumen Listo          │
│                             │
│  El resumen clínico está   │
│  listo para ser enviado    │
│  al médico.                │
│                             │
│  [📨 Enviar al Médico]     │
│  [Iniciar Nueva Sesión]    │
└─────────────────────────────┘
```

### 4.2 Modal de Información del Paciente

Al hacer click en "Enviar al Médico", se abre un modal solicitando:

```
┌────────────────────────────────────────┐
│  Enviar Resumen Clínico al Médico     │
├────────────────────────────────────────┤
│                                        │
│  👤 Nombre Completo                   │
│  [________________________]            │
│                                        │
│  📅 Fecha de Nacimiento               │
│  [____-__-__]                         │
│                                        │
│  📧 Su Correo Electrónico             │
│  [________________________]            │
│                                        │
│  🩺 Correo del Médico                 │
│  [________________________]            │
│                                        │
│  [Cerrar]  [📨 Enviar Resumen]        │
└────────────────────────────────────────┘
```

**Validaciones**:
- Todos los campos son obligatorios
- Formato de email válido (RFC 5322)
- Fecha de nacimiento no puede ser futura

### 4.3 Proceso de Guardado en Base de Datos

**Backend**: Supabase Edge Function `save-consultation`

**Datos guardados**:
```javascript
{
  // Información del paciente
  patient_name: "Juan Pérez García",
  patient_email: "juan.perez@email.com",
  patient_dob: "1985-03-15",

  // Metadata de sesión
  session_id: "1763489465961-abc123",
  session_duration: 1247, // segundos
  language: "es",

  // Contenido clínico
  transcript: [...], // Array completo de mensajes
  summary: "...", // Resumen HTML generado por Gemini Pro

  // Análisis de motivación (extraído del summary)
  motivation_scores: {
    importance: 7,
    confidence: 6,
    readiness: 7
  },
  change_talk_signals: {
    desire: true,
    ability: true,
    reason: true,
    need: true,
    commitment: true,
    activation: true,
    taking_steps: false
  },
  motivation_classification: "MEDIA-ALTA",

  // Auditoría
  user_id: "23b65ecb-8b17-433a-b319-97614f74dd87",
  created_at: "2025-11-18T13:15:45.123Z"
}
```

**Tablas de Supabase**:
- `consultations` - Registro principal de la consulta
- `session_transcripts` - Transcripción detallada (relacionada)
- `motivation_analysis` - Análisis de motivación (relacionada)

### 4.4 Envío de Email al Médico

**Backend**: Supabase Edge Function `send-summary-email`

**Contenido del email**:

```
Para: doctor@clinic.com
De: noreply@cabohealth.com
Asunto: Nueva Consulta - Juan Pérez García (ID: A3B4C5D6)

────────────────────────────────────────────────

📋 NUEVA CONSULTA - CABO HEALTH NOVA

Paciente: Juan Pérez García
Fecha: 18 de Noviembre, 2025
Duración: 20 minutos 47 segundos
ID de Consulta: A3B4C5D6

────────────────────────────────────────────────

RESUMEN CLÍNICO:

[Contenido completo del resumen HTML renderizado]

────────────────────────────────────────────────

CLASIFICACIÓN MOTIVACIONAL: MEDIA-ALTA

El paciente muestra buena disposición para el cambio.
Ver análisis detallado en el portal médico.

────────────────────────────────────────────────

Ver consulta completa:
https://cabohealth.com/doctor/consultations/A3B4C5D6

────────────────────────────────────────────────
Cabo Health Nova - Next-Gen Clinical AI
by Ivan Guaderrama
────────────────────────────────────────────────
```

**Proveedor de Email**: Configurado en Supabase (SendGrid, AWS SES, Postmark, etc.)

### 4.5 Confirmación al Paciente

Tras envío exitoso:

```
┌────────────────────────────────────────┐
│           ✓                            │
│     Resumen Enviado                    │
│                                        │
│  El resumen clínico ha sido enviado   │
│  exitosamente a:                       │
│  doctor@clinic.com                     │
│                                        │
│  ID de Confirmación:                   │
│  ┌──────────────┐                     │
│  │  A3B4C5D6    │                     │
│  └──────────────┘                     │
│                                        │
│  [Hecho]                              │
└────────────────────────────────────────┘
```

**ID de Confirmación**:
- Primeros 8 caracteres del `consultation_id`
- En mayúsculas
- Sirve como referencia para seguimiento

---

## 🔐 5. ACCESO DEL MÉDICO (Portal Médico)

### 5.1 Portal de Consultas

**URL**: `https://cabohealth.com/doctor`
**Autenticación**: Supabase Auth (email/contraseña)

**Dashboard del Médico**:
```
┌────────────────────────────────────────────────────┐
│  Cabo Health Nova - Portal Médico                 │
├────────────────────────────────────────────────────┤
│                                                    │
│  📊 Consultas Recientes                           │
│  ┌────────────────────────────────────────────┐  │
│  │ Juan Pérez García      18 Nov, 2025       │  │
│  │ ID: A3B4C5D6           🟢 ALTA MOTIVACIÓN │  │
│  │ [Ver Consulta]                            │  │
│  ├────────────────────────────────────────────┤  │
│  │ María López Ruiz       17 Nov, 2025       │  │
│  │ ID: B7C8D9E0           🟡 MEDIA MOTIVACIÓN│  │
│  │ [Ver Consulta]                            │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│  🔍 Filtros:                                      │
│  [Todas] [Alta Motivación] [Media] [Baja]        │
│  [Últimos 7 días ▼]                               │
└────────────────────────────────────────────────────┘
```

### 5.2 Vista Detallada de Consulta

**URL**: `https://cabohealth.com/doctor/consultations/A3B4C5D6`

```
┌─────────────────────────────────────────────────┐
│  Consulta: Juan Pérez García                    │
│  ID: A3B4C5D6 | 18 Nov, 2025 | 20m 47s         │
├─────────────────────────────────────────────────┤
│                                                 │
│  📋 RESUMEN CLÍNICO (SOAP)                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [Contenido completo del resumen SOAP]         │
│                                                 │
│  🎯 ANÁLISIS DE MOTIVACIÓN                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Clasificación: 🟢 MEDIA-ALTA MOTIVACIONAL     │
│                                                 │
│  Puntuaciones:                                  │
│  ▰▰▰▰▰▰▰◯◯◯ Importancia: 7/10                 │
│  ▰▰▰▰▰▰◯◯◯◯ Confianza: 6/10                   │
│  ▰▰▰▰▰▰▰◯◯◯ Readiness: 7/10                   │
│                                                 │
│  [Ver Transcripción Completa]                   │
│  [Descargar PDF]                                │
│  [Agendar Seguimiento]                          │
└─────────────────────────────────────────────────┘
```

### 5.3 Funcionalidades del Portal

**El médico puede**:
1. ✅ Ver todas las consultas de sus pacientes
2. ✅ Filtrar por clasificación motivacional
3. ✅ Buscar por nombre o ID de consulta
4. ✅ Ver transcripción completa de la conversación
5. ✅ Descargar resumen en PDF
6. ✅ Exportar datos para historia clínica
7. ✅ Agendar citas de seguimiento
8. ✅ Ver evolución de múltiples consultas del mismo paciente
9. ✅ Priorizar pacientes por nivel de motivación

---

## 🎭 CARACTERÍSTICAS CLAVE DE LA ENTREVISTA

### ✅ Lo que SÍ hace Nova:

1. **Indagación Proactiva Automática**
   - Detecta automáticamente cuando el paciente menciona un problema
   - Profundiza con 5 niveles de preguntas específicas
   - No espera a que el paciente proporcione información voluntariamente

2. **Adaptación Dinámica**
   - No sigue un script rígido
   - Ajusta preguntas basándose en respuestas previas
   - Prioriza áreas que el paciente menciona como problemáticas

3. **Evaluación de Motivación**
   - Mide disposición real para cambio (no solo síntomas)
   - Identifica barreras y facilitadores
   - Clasifica al paciente por nivel de adherencia probable

4. **Empatía Profesional**
   - Usa reflejos empáticos ("Entiendo que...")
   - Aseveraciones positivas que validan esfuerzos
   - Mantiene calidez sin perder estructura médica

5. **Preguntas Abiertas Estratégicas**
   - "¿Qué te gustaría que fuera diferente?"
   - "¿Cómo te afecta esto en tu día a día?"
   - "¿Qué tan listo/a te sientes para hacer cambios?"

### ❌ Lo que NO hace Nova:

1. **NO hace diagnósticos médicos directos**
   - No dice "Tienes X enfermedad"
   - Recolecta información para que el médico diagnostique

2. **NO prescribe tratamientos**
   - No recomienda medicamentos específicos
   - No sustituye la consulta médica profesional

3. **NO juzga las respuestas**
   - Mantiene neutralidad clínica
   - No critica hábitos actuales
   - Usa principios de entrevista motivacional

4. **NO hace promesas de curación**
   - Evita garantías sobre resultados
   - Se enfoca en recolectar información objetiva

5. **NO salta preguntas importantes**
   - Si el paciente menciona algo relevante, SIEMPRE profundiza
   - No acepta respuestas superficiales para síntomas significativos

---

## 📊 VALOR CLÍNICO DEL SISTEMA

### Para el Paciente:
- ✅ Entrevista estructurada y completa
- ✅ Sensación de ser escuchado profundamente
- ✅ Claridad sobre su propia motivación para cambiar
- ✅ Preparación para consulta médica más productiva

### Para el Médico:
- ✅ Historia clínica pre-recopilada y estructurada
- ✅ Análisis de motivación para predecir adherencia
- ✅ Priorización de pacientes por disposición al cambio
- ✅ Ahorro de 15-20 minutos de recolección de información
- ✅ Mejor uso del tiempo de consulta (decisiones vs. recolección)

### Para el Sistema de Salud:
- ✅ Filtro inteligente de pacientes motivados vs. no motivados
- ✅ Optimización de recursos (priorizando alta adherencia)
- ✅ Documentación estandarizada en formato SOAP
- ✅ Datos estructurados para análisis poblacional

---

## 🔧 TECNOLOGÍAS UTILIZADAS

### Frontend:
- React + TypeScript
- TailwindCSS
- Vite (build tool)
- WebAudio API + AudioWorklet

### Backend:
- Supabase (PostgreSQL + Auth + Edge Functions)
- Supabase Storage (audio fragments)

### IA:
- Google Gemini 2.5 Flash Native Audio (conversación)
- Google Gemini 2.5 Pro (análisis y resumen)
- Multimodal Live API (WebSocket)

### Email:
- Configurado via Supabase Functions
- Proveedor: SendGrid / AWS SES / Postmark

---

## 📝 EJEMPLO COMPLETO DE ENTREVISTA

### Apertura:
```
Nova: "Hola, soy Nova. Mi objetivo es entender tu situación de salud
       y evaluar qué tan motivado/a estás para hacer cambios positivos.
       Comencemos: ¿Qué te trae hoy aquí?"

Paciente: "Últimamente me siento muy cansado y he subido de peso"
```

### Indagación Automática (Cansancio):
```
Nova: "Entiendo. Cuéntame más sobre ese cansancio. ¿Cuándo comenzó
       exactamente?"

Paciente: "Hace como 3 meses"

Nova: "¿Y en qué momentos del día lo notas más?"

Paciente: "Sobre todo en las tardes"

Nova: "¿Qué has notado que mejora o empeora ese cansancio?"

Paciente: "Cuando duermo bien me siento un poco mejor, pero igual sigo cansado"

Nova: "¿Cómo está afectando esto tu vida diaria? ¿Tu trabajo, tus actividades?"

Paciente: "Sí, me cuesta concentrarme en el trabajo y ya no tengo ganas
          de hacer ejercicio"
```

### Exploración de Hábitos:
```
Nova: "Cuéntame sobre tus hábitos de sueño. ¿Cuántas horas duermes normalmente?"

Paciente: "Como 5-6 horas, me cuesta dormirme"

Nova: "¿Qué haces antes de acostarte? ¿Usas pantallas, teléfono?"

Paciente: "Sí, siempre reviso el teléfono en la cama"

Nova: "Hablando de alimentación, ¿cómo es un día típico de comidas para ti?"

[... continúa explorando las 11 áreas de la matriz ...]
```

### Evaluación de Motivación:
```
Nova: "Dijiste que quieres perder peso y mejorar tu energía.
       En una escala del 1 al 10, ¿qué tan importante es para ti
       hacer cambios en tu estilo de vida?"

Paciente: "Diría que un 7"

Nova: "Eso es bastante importante. ¿Y qué tan confiado/a te sientes
       de poder hacer esos cambios?"

Paciente: "Mmm... tal vez un 5 o 6. No sé si pueda con mi horario de trabajo"

Nova: "Entiendo. ¿Qué te haría sentir más confiado/a?"

Paciente: "Creo que si tuviera un plan claro y quizás apoyo de un nutricionista"

Nova: "Excelente. Eso muestra que estás pensando en pasos concretos.
       ¿Qué tan listo/a te sientes para empezar a hacer cambios,
       del 1 al 10?"

Paciente: "Un 7, sí quiero empezar pronto"
```

### Cierre:
```
Nova: "Excelente, hemos cubierto aspectos muy importantes. Tu información
       será muy valiosa para el equipo clínico. Ahora voy a generar un
       análisis completo que incluya tanto los hallazgos médicos como tu
       nivel de disposición para adoptar cambios saludables."
```

### Resumen Generado:

```html
<h2>📋 Resumen Clínico (SOAP)</h2>

<h3>S - Subjetivo:</h3>
<p>Paciente masculino reporta fatiga persistente de 3 meses de evolución,
más intensa en horas vespertinas. Menciona ganancia de peso no cuantificada.
Asocia mejoría parcial con buen descanso pero persiste sintomatología.
Refiere dificultad para concentrarse en trabajo y pérdida de motivación
para actividad física.</p>

<h3>O - Objetivo:</h3>
<ul>
<li>Patrón de sueño: 5-6 horas nocturnas</li>
<li>Higiene de sueño deficiente: uso de pantallas pre-sueño</li>
<li>Sedentarismo actual (previamente activo)</li>
<li>Horario laboral demandante</li>
</ul>

<h3>A - Apreciación:</h3>
<p>Probable síndrome de fatiga multifactorial con componentes de:</p>
<ol>
<li>Privación crónica de sueño</li>
<li>Higiene de sueño inadecuada</li>
<li>Sedentarismo secundario</li>
<li>Posible ganancia ponderal reactiva</li>
</ol>
<p>Descartar: Hipotiroidismo, anemia, síndrome metabólico, apnea del sueño</p>

<h3>P - Plan:</h3>
<ol>
<li>Laboratorios: BHC, QS, perfil tiroideo, perfil lipídico</li>
<li>Evaluación nutricional especializada</li>
<li>Higiene de sueño: restricción pantallas 1h antes de dormir</li>
<li>Seguimiento en 2 semanas con resultados</li>
</ol>

<h2>🎯 Análisis de Motivación para el Cambio</h2>

<h3>Puntuación de Disposición (1-10):</h3>
<ul>
<li><strong>Importancia percibida del cambio:</strong> 7/10</li>
<li><strong>Confianza en capacidad de cambio:</strong> 6/10</li>
<li><strong>Readiness general:</strong> 7/10</li>
</ul>

<h3>Señales de Discurso de Cambio (DARNCAT):</h3>
<ul>
<li><strong>D</strong>eseo: ✓ Expresa deseo claro de mejorar energía y peso</li>
<li><strong>A</strong>bilidad: ✓ Reconoce que puede hacer cambios con apoyo</li>
<li><strong>R</strong>azones: ✓ Identifica impacto en trabajo y calidad de vida</li>
<li><strong>N</strong>ecesidad: ✓ Siente necesidad de actuar ("quiero empezar pronto")</li>
<li><strong>C</strong>ommitment: ✓ Menciona disposición a consultar nutricionista</li>
<li><strong>A</strong>ctivación: ✓ Piensa en pasos concretos (plan, apoyo profesional)</li>
<li><strong>T</strong>omar pasos: ⚠ Aún no ha iniciado acciones concretas</li>
</ul>

<h3>Filtro de Paciente:</h3>
<p><strong>Clasificación:</strong> 🟢 MEDIA-ALTA MOTIVACIONAL</p>

<p><strong>Razón:</strong> Paciente muestra alto reconocimiento del problema
y buena importancia percibida (7/10). Confianza moderada (6/10) con
identificación clara de barreras (horario laboral) y facilitadores
(apoyo profesional, plan estructurado). Ha verbalizado cambios de
conversación pro-cambio (DARNCAT 6/7 positivos) pero aún no ha iniciado
acciones concretas.</p>

<p><strong>Recomendación:</strong> Paciente es buen candidato para intervención.
Requiere apoyo estructurado inicial para construir confianza y pasar de
contemplación a acción. Plan de seguimiento quincenal recomendado con
objetivos graduales. Alta probabilidad de adherencia si se proporcionan
recursos adecuados (nutricionista, plan de ejercicio adaptado).</p>

<h3>Áreas de Cambio Prioritarias:</h3>
<ol>
<li><strong>Higiene de sueño</strong> (Motivación: 8/10) - Mayor apertura,
    cambio simple, impacto rápido</li>
<li><strong>Alimentación</strong> (Motivación: 7/10) - Reconoce necesidad,
    busca apoyo profesional</li>
<li><strong>Actividad física</strong> (Motivación: 5/10) - Requiere
    trabajar barreras de tiempo y energía primero</li>
</ol>
```

---

## 🎓 CONCLUSIÓN

Cabo Health Nova no es solo un sistema de transcripción médica. Es una herramienta de **triaje inteligente** que evalúa simultáneamente:

1. **Condición médica** → Resumen SOAP estructurado
2. **Disposición psicológica** → Análisis de motivación MITI 4.2.1
3. **Predicción de adherencia** → Clasificación motivacional

Esto permite a los médicos:
- **Optimizar tiempo de consulta** (información ya recopilada)
- **Priorizar pacientes** (alta motivación = mayor ROI de intervención)
- **Personalizar estrategia** (approach diferente según clasificación)
- **Mejorar resultados** (identificar y abordar barreras antes de prescribir)

El sistema transforma la entrevista médica tradicional en un proceso **proactivo, estructurado y orientado a resultados**.
