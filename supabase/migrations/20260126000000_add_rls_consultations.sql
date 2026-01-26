-- Migración: Agregar RLS a la tabla consultations
-- Fecha: 2026-01-26
-- Descripción: Proteger datos médicos con Row Level Security

-- 1. Habilitar RLS en la tabla consultations
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- 2. Política para SELECT:
--    - Pacientes pueden ver sus propias consultas
--    - Doctores pueden ver todas las consultas
CREATE POLICY "Users can view own consultations, doctors can view all"
ON consultations FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'doctor'
  )
);

-- 3. Política para INSERT: Solo usuarios autenticados pueden crear consultas
CREATE POLICY "Authenticated users can create consultations"
ON consultations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Política para UPDATE: Solo el dueño o doctores pueden actualizar
CREATE POLICY "Owner or doctors can update consultations"
ON consultations FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'doctor'
  )
);

-- 5. Política para DELETE: Solo doctores pueden eliminar
CREATE POLICY "Only doctors can delete consultations"
ON consultations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'doctor'
  )
);

-- Comentario de documentación
COMMENT ON TABLE consultations IS 'Consultas médicas protegidas con RLS - Pacientes ven las suyas, doctores ven todas';
