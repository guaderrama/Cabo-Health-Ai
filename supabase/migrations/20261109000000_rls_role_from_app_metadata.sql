-- Migración: el rol de médico se lee de app_metadata (solo lo puede asignar un administrador)
-- Fecha: 2026-11-09
--
-- La migración 20260126000000_add_rls_consultations.sql leía el rol de user_metadata,
-- que cualquier usuario puede escribir al registrarse. Producción ya usa app_metadata
-- (verificado el 2026-11-09 en pg_policies); este archivo deja el repo igual que producción
-- para que un entorno nuevo no quede con la versión insegura.

DROP POLICY IF EXISTS "Users can view own consultations, doctors can view all" ON consultations;
CREATE POLICY "Users can view own consultations, doctors can view all"
ON consultations FOR SELECT
USING (
  auth.uid() = user_id
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'doctor'
);

DROP POLICY IF EXISTS "Owner or doctors can update consultations" ON consultations;
CREATE POLICY "Owner or doctors can update consultations"
ON consultations FOR UPDATE
USING (
  auth.uid() = user_id
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'doctor'
);

DROP POLICY IF EXISTS "Only doctors can delete consultations" ON consultations;
CREATE POLICY "Only doctors can delete consultations"
ON consultations FOR DELETE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'doctor'
);
