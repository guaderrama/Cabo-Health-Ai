-- =====================================================
-- FIX: Audio storage RLS - owner-based access control
-- =====================================================
-- Previously any authenticated user could read/delete ANY audio file.
-- Now files must be stored under {user_id}/ path prefix.
-- =====================================================

-- Drop old overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete audio" ON storage.objects;

-- Owner-based upload: users can only upload to their own folder
CREATE POLICY "Users can upload own audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'consultation-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-based read: users can only read their own audio
CREATE POLICY "Users can read own audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'consultation-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-based update: users can only update their own audio
CREATE POLICY "Users can update own audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'consultation-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'consultation-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owner-based delete: users can only delete their own audio
CREATE POLICY "Users can delete own audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'consultation-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
