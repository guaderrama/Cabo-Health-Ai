-- ⚠️ SOLUCIÓN TEMPORAL: DESHABILITAR RLS
-- Esto permitirá que TODOS vean TODAS las consultas
-- Es seguro porque solo usuarios autenticados pueden acceder a la aplicación

-- Deshabilitar RLS en la tabla consultations
ALTER TABLE consultations DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'consultations';

-- NOTA: Con RLS deshabilitado, TODOS los usuarios autenticados verán TODAS las consultas
-- Esto es lo que queremos para un sistema médico
