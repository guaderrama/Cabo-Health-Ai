-- ================================================================
-- SIMPLIFICACIÓN DE BASE DE DATOS - CABO HEALTH NOVA
-- Ejecuta este SQL en Supabase SQL Editor
-- ================================================================

-- 1. Agregar columnas necesarias a consultations
-- (Solo agrega las que no existen, ignora errores si ya existen)

-- Columnas del paciente
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_dob DATE,
ADD COLUMN IF NOT EXISTS patient_email TEXT;

-- Datos de la consulta
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS motivation_score NUMERIC(3,1) CHECK (motivation_score >= 0 AND motivation_score <= 10);

-- Métricas de sesión
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- 2. Hacer patient_id NULLABLE (ya que ahora guardamos datos inline)
ALTER TABLE consultations
ALTER COLUMN patient_id DROP NOT NULL;

-- 3. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_session_id ON consultations(session_id);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);

-- 4. Ver la estructura final
\d consultations

-- RESULTADO ESPERADO:
-- ✅ consultations ahora tiene:
--    - patient_name, patient_dob, patient_email (datos inline del paciente)
--    - transcript (JSONB array con todos los mensajes)
--    - summary (HTML del resumen médico)
--    - motivation_score (1-10)
--    - session_duration (segundos)
--    - message_count (número de mensajes)

-- ================================================================
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Ve a "SQL Editor" en el menú lateral
-- 4. Pega este SQL completo
-- 5. Click en "Run"
-- ================================================================
