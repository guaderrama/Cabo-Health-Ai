# Análisis de Supabase - Cabo Health Nova

**Fecha de análisis**: 2025-01-03  
**URL del Proyecto**: https://cozsoshuctvhvdbmkmwc.supabase.co  
**Proyecto ID**: cozsoshuctvhvdbmkmwc

> ⚠️ **Nota**: Este reporte se generará automáticamente cuando ejecutes `pnpm run analyze-supabase`.  
> Mientras tanto, aquí está la información conocida del proyecto.

---

## 📊 Resumen General

### Tablas Principales

Según el análisis del código, estas son las tablas configuradas y utilizadas:

- **patients**: Información de pacientes (User-based) ✅ Confirmada en código
- **consultations**: Consultas médicas (Generated) ✅ Confirmada en código
- **transcriptions**: Transcripciones de conversaciones (Real-time) ✅ Confirmada en código
- **summaries**: Resúmenes clínicos SOAP (Auto-generated) ✅ Confirmada en código
- **session_checkpoints**: Checkpoints de persistencia (Auto-saved) ✅ Confirmada en código
- **sessions**: Sesiones de consultas con duración ⚠️ **Descubierta en Edge Functions**

---

## 📋 Esquema de Base de Datos

### 1. Tabla: `patients`

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Políticas RLS**:
- Usuarios solo pueden acceder a sus propios pacientes
- Service role puede acceder a todos los pacientes

---

### 2. Tabla: `consultations`

```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  patient_id UUID REFERENCES patients(id),
  session_id UUID UNIQUE NOT NULL,
  language TEXT CHECK (language IN ('es', 'en')),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**Políticas RLS**:
- Usuarios solo pueden acceder a sus propias consultas
- Service role puede acceder a todas las consultas

---

### 3. Tabla: `transcriptions`

```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id),
  sender TEXT CHECK (sender IN ('user', 'nova')),
  text TEXT NOT NULL,
  language TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  audio_url TEXT
);
```

**Políticas RLS**:
- Usuarios pueden acceder a transcripciones de sus consultas
- Acceso a través de la relación con `consultations`

---

### 4. Tabla: `summaries`

```sql
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id),
  html_content TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  doctor_email TEXT
);
```

**Políticas RLS**:
- Usuarios pueden acceder a resúmenes de sus consultas
- Acceso a través de la relación con `consultations`

---

### 5. Tabla: `sessions`

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id),
  duration_seconds INTEGER,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Uso en código**: 
- Guardada por `save-consultation` Edge Function
- Consultada por `get-consultations` Edge Function
- Contiene duración de sesión y tiempo de finalización

---

### 6. Tabla: `session_checkpoints`

```sql
CREATE TABLE session_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  consultation_id UUID REFERENCES consultations(id),
  session_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  transcript JSONB NOT NULL,
  message_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Políticas RLS**:
- Usuarios solo pueden acceder a sus propios checkpoints
- Índices optimizados:
  - `idx_session_checkpoints_user_id`
  - `idx_session_checkpoints_session_id`
  - `idx_session_checkpoints_updated_at`

---

## 🚀 Edge Functions Desplegadas

### 1. `save-consultation`
- **Propósito**: Guarda consulta completa (paciente, consulta, transcripciones, resumen, sesión)
- **Estado**: ✅ Activa
- **Ruta**: `/functions/v1/save-consultation`
- **Operaciones**:
  - Crea/actualiza `patients`
  - Crea `consultations`
  - Inserta múltiples `transcriptions`
  - Inserta `summaries` (si existe)
  - Inserta `sessions` (si hay duración)
- **Variables requeridas**: `SERVICE_ROLE_KEY`, `PROJECT_URL`

### 2. `generate-summary`
- **Propósito**: Genera resumen SOAP usando Gemini AI
- **Estado**: ✅ Activa
- **Ruta**: `/functions/v1/generate-summary`
- **Variables requeridas**: `GEMINI_API_KEY`

### 3. `send-summary-email`
- **Propósito**: Envía el resumen clínico al médico por email
- **Estado**: ✅ Activa
- **Ruta**: `/functions/v1/send-summary-email`
- **Variables opcionales**: `RESEND_API_KEY`

### 4. `get-consultations`
- **Propósito**: Obtiene historial completo de consultas del usuario
- **Estado**: ✅ Activa
- **Ruta**: `/functions/v1/get-consultations`
- **Retorna**:
  - Consultas del paciente autenticado
  - Transcripciones asociadas (ordenadas por timestamp)
  - Resúmenes asociados
  - Sesiones asociadas
- **Variables requeridas**: `SERVICE_ROLE_KEY`, `PROJECT_URL`

---

## 🔒 Configuración de Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:

✅ **patients** - Políticas basadas en `user_id`  
✅ **consultations** - Políticas basadas en `user_id`  
✅ **transcriptions** - Políticas basadas en relación con `consultations`  
✅ **summaries** - Políticas basadas en relación con `consultations`  
✅ **session_checkpoints** - Políticas basadas en `user_id`

### Variables de Entorno Configuradas

**Frontend (Vite)**:
- `VITE_SUPABASE_URL` - URL del proyecto
- `VITE_SUPABASE_ANON_KEY` - Clave pública anónima
- `VITE_GEMINI_API_KEY` - API key de Gemini

**Backend (Edge Functions)**:
- `GEMINI_API_KEY` - API key de Gemini para Edge Functions (usada en `generate-summary`)
- `SERVICE_ROLE_KEY` - Clave de servicio para operaciones administrativas (usada en todas las funciones)
- `PROJECT_URL` - URL del proyecto Supabase (usada en `save-consultation` y `get-consultations`)
- `RESEND_API_KEY` - (Opcional) Para envío de emails (usada en `send-summary-email`)

---

## 📈 Análisis de Datos

Para obtener un análisis completo con conteos de registros y datos de ejemplo, ejecuta:

```bash
pnpm run analyze-supabase
```

Este comando:
1. Se conectará a Supabase usando las credenciales del proyecto
2. Contará registros en cada tabla
3. Obtendrá ejemplos de datos
4. Analizará distribuciones (estados, idiomas, etc.)
5. Generará un reporte actualizado en este archivo

---

## 🔍 Verificación Manual

### Dashboard de Supabase

Para verificar el estado actual:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc)
2. **Table Editor**: Verifica tablas y datos
3. **Authentication → Policies**: Verifica políticas RLS
4. **Edge Functions**: Verifica funciones desplegadas
5. **Settings → Environment Variables**: Verifica variables configuradas

### SQL Editor

Puedes ejecutar estas consultas en el SQL Editor:

```sql
-- Contar registros por tabla
SELECT 
  'patients' as table_name, COUNT(*) as count FROM patients
UNION ALL
SELECT 'consultations', COUNT(*) FROM consultations
UNION ALL
SELECT 'transcriptions', COUNT(*) FROM transcriptions
UNION ALL
SELECT 'summaries', COUNT(*) FROM summaries
UNION ALL
SELECT 'session_checkpoints', COUNT(*) FROM session_checkpoints;

-- Consultas por estado
SELECT status, COUNT(*) as count 
FROM consultations 
GROUP BY status;

-- Consultas por idioma
SELECT language, COUNT(*) as count 
FROM consultations 
GROUP BY language;
```

---

## 📝 Notas

- Este análisis se basa en la documentación del proyecto
- Para datos actualizados, ejecuta el script de análisis
- Las políticas RLS no se pueden consultar directamente con el cliente anon
- Verifica en el Dashboard para información detallada de seguridad

---

*Última actualización: 2025-01-03*  
*Para actualizar este reporte, ejecuta: `pnpm run analyze-supabase`*

