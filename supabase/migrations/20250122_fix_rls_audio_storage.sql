-- =====================================================
-- FIX RLS POLICIES FOR AUDIO STORAGE AND CHECKPOINTS
-- =====================================================
-- Fecha: 2025-01-22
-- Propósito: Arreglar errores críticos de RLS que bloquean:
--   1. Subidas de audio a consultation-audio bucket
--   2. Consultas a session_checkpoints table
-- =====================================================

-- =====================================================
-- PARTE 1: ARREGLAR STORAGE BUCKET (consultation-audio)
-- =====================================================

-- Asegurar que el bucket existe y RLS está habilitado
INSERT INTO storage.buckets (id, name, public)
VALUES ('consultation-audio', 'consultation-audio', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Eliminar políticas antiguas si existen para empezar limpio
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete audio" ON storage.objects;

-- POLÍTICA 1: Permitir INSERT de archivos de audio (CRÍTICO - Arregla el error 400)
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'consultation-audio'
);

-- POLÍTICA 2: Permitir SELECT de archivos de audio
CREATE POLICY "Authenticated users can read audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'consultation-audio'
);

-- POLÍTICA 3: Permitir UPDATE de archivos de audio
CREATE POLICY "Authenticated users can update audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'consultation-audio'
)
WITH CHECK (
  bucket_id = 'consultation-audio'
);

-- POLÍTICA 4: Permitir DELETE de archivos de audio (para cleanup)
CREATE POLICY "Authenticated users can delete audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'consultation-audio'
);

-- =====================================================
-- PARTE 2: ARREGLAR SESSION_CHECKPOINTS TABLE
-- =====================================================

-- Asegurar que RLS está habilitado
ALTER TABLE session_checkpoints ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can select own checkpoints" ON session_checkpoints;
DROP POLICY IF EXISTS "Users can insert own checkpoints" ON session_checkpoints;
DROP POLICY IF EXISTS "Users can update own checkpoints" ON session_checkpoints;
DROP POLICY IF EXISTS "Users can delete own checkpoints" ON session_checkpoints;

-- POLÍTICA 1: SELECT - Arregla el error 406
CREATE POLICY "Users can select own checkpoints"
ON session_checkpoints
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- POLÍTICA 2: INSERT - Permitir crear checkpoints
CREATE POLICY "Users can insert own checkpoints"
ON session_checkpoints
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- POLÍTICA 3: UPDATE - Permitir actualizar checkpoints
CREATE POLICY "Users can update own checkpoints"
ON session_checkpoints
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- POLÍTICA 4: DELETE - Permitir eliminar checkpoints (cleanup)
CREATE POLICY "Users can delete own checkpoints"
ON session_checkpoints
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

-- =====================================================
-- VERIFICACIÓN DE POLÍTICAS
-- =====================================================

-- Verificar políticas de storage.objects para consultation-audio
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%audio%';

-- Verificar políticas de session_checkpoints
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'session_checkpoints';

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. Las políticas de storage.objects aplican a TODOS los buckets,
--    pero filtramos por bucket_id = 'consultation-audio'
--
-- 2. Las políticas de session_checkpoints verifican que user_id
--    coincida con auth.uid() para seguridad
--
-- 3. Después de aplicar esta migración:
--    - Los errores "new row violates row-level security policy"
--      en uploads de audio deben desaparecer
--    - Los errores 406 en session_checkpoints deben resolverse
--
-- 4. Para aplicar esta migración:
--    npx supabase db push
--
-- 5. Para verificar en producción:
--    - Iniciar una nueva consulta
--    - Verificar que los fragmentos de audio se suben sin errores
--    - Verificar que los checkpoints se guardan correctamente
--
-- =====================================================
