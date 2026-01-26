-- Migración: Agregar RLS a la tabla consultations
-- Fecha: 2026-01-26
-- Descripción: Proteger datos médicos con Row Level Security
-- NOTA: Usa JWT (auth.jwt()) en lugar de auth.users para evitar permission denied

-- 1. Habilitar RLS en la tabla consultations
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- 2. Política para SELECT: pacientes ven las suyas, doctores ven todas
CREATE POLICY "Users can view own consultations, doctors can view all"
ON consultations FOR SELECT
USING (
  auth.uid() = user_id
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'doctor'
);

-- 3. Política para INSERT: Solo el dueño puede crear
CREATE POLICY "Authenticated users can create consultations"
ON consultations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Política para UPDATE: dueño o doctores
CREATE POLICY "Owner or doctors can update consultations"
ON consultations FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'doctor'
);

-- 5. Política para DELETE: solo doctores
CREATE POLICY "Only doctors can delete consultations"
ON consultations FOR DELETE
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'doctor'
);

-- Comentario de documentación
COMMENT ON TABLE consultations IS 'Consultas médicas protegidas con RLS - Pacientes ven las suyas, doctores ven todas';
