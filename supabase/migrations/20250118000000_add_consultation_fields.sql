-- Migración: Agregar campos necesarios a la tabla consultations
-- Fecha: 2025-01-18
-- Descripción: Simplificación de la estructura - datos inline sin tablas separadas

-- 1. Agregar columnas del paciente (inline, sin tabla separada)
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_dob DATE,
ADD COLUMN IF NOT EXISTS patient_email TEXT;

-- 2. Agregar datos de la consulta
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS motivation_score NUMERIC(3,1);

-- 3. Agregar métricas de sesión
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- 4. Hacer patient_id NULLABLE (ya que ahora los datos están inline)
ALTER TABLE consultations
ALTER COLUMN patient_id DROP NOT NULL;

-- 5. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_session_id ON consultations(session_id);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);

-- Comentarios para documentación
COMMENT ON COLUMN consultations.patient_name IS 'Nombre completo del paciente (inline)';
COMMENT ON COLUMN consultations.patient_dob IS 'Fecha de nacimiento del paciente';
COMMENT ON COLUMN consultations.transcript IS 'Array JSON con todos los mensajes de la conversación';
COMMENT ON COLUMN consultations.summary IS 'Resumen médico generado en formato HTML';
COMMENT ON COLUMN consultations.motivation_score IS 'Puntuación de motivación del paciente (1-10)';
COMMENT ON COLUMN consultations.session_duration IS 'Duración de la sesión en segundos';
COMMENT ON COLUMN consultations.message_count IS 'Número total de mensajes en la conversación';
