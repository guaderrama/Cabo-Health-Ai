-- SOLUCIÓN SIMPLE: Permitir que usuarios autenticados vean TODAS las consultas
-- Esto es apropiado para un sistema médico donde los doctores necesitan ver todas las consultas

-- 1. Eliminar todas las políticas SELECT existentes
DROP POLICY IF EXISTS "Doctors can view all consultations" ON consultations;
DROP POLICY IF EXISTS "Users can view own consultations" ON consultations;
DROP POLICY IF EXISTS "Allow authenticated users to read consultations" ON consultations;
DROP POLICY IF EXISTS "Anyone can view consultations" ON consultations;
DROP POLICY IF EXISTS "Authenticated users can view all" ON consultations;

-- 2. Crear política SIMPLE que permite a usuarios autenticados ver todo
CREATE POLICY "Authenticated users can view all"
ON consultations
FOR SELECT
USING (auth.role() = 'authenticated');

-- 3. Mantener la política de INSERT (usuarios solo pueden insertar sus propias consultas)
DROP POLICY IF EXISTS "Users can insert own consultations" ON consultations;

CREATE POLICY "Users can insert own consultations"
ON consultations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Verificar políticas
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'consultations'
ORDER BY policyname;
