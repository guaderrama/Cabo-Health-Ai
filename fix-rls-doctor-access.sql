-- Script para permitir que los médicos vean TODAS las consultas
-- Ejecutar esto en el SQL Editor de Supabase Dashboard

-- 1. Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Users can view own consultations" ON consultations;
DROP POLICY IF EXISTS "Allow authenticated users to read consultations" ON consultations;
DROP POLICY IF EXISTS "Anyone can view consultations" ON consultations;

-- 2. Crear política que permita a los médicos ver TODAS las consultas
-- Los médicos necesitan ver todas las consultas de todos los pacientes
CREATE POLICY "Doctors can view all consultations"
ON consultations
FOR SELECT
USING (
  -- Permitir si el usuario tiene rol 'doctor'
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'doctor'
  OR
  -- Permitir ver tus propias consultas (si eres paciente)
  auth.uid() = user_id
);

-- 3. Política para INSERT (ya existe pero la recreamos por si acaso)
DROP POLICY IF EXISTS "Users can insert own consultations" ON consultations;

CREATE POLICY "Users can insert own consultations"
ON consultations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- 4. Verificar que RLS esté habilitado
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- 5. Mostrar políticas actuales
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'consultations';
