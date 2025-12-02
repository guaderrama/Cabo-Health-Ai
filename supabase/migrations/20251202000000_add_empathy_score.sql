-- Migración: Agregar campo empathy_score a consultations
-- Fecha: 2025-12-02
-- Descripción: Agregar columna para almacenar el score de empatía calculado

-- Agregar columna empathy_score
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS empathy_score NUMERIC(3,1);

-- Comentario para documentación
COMMENT ON COLUMN consultations.empathy_score IS 'Puntuación de empatía/confianza del paciente (1-10), calculada desde el resumen';
