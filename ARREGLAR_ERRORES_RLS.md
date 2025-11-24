# 🔧 Arreglar Errores Críticos de RLS

## 🎯 Problemas que Resuelve

Este archivo SQL arregla los 2 errores críticos identificados en la consola:

### ❌ Error 1: Audio Storage (CRÍTICO)
```
Error al subir audio WAV: StorageApiError: new row violates row-level security policy
POST https://...supabase.co/storage/v1/object/consultation-audio/*.wav 400
```

**Impacto**: Los fragmentos de audio NO se están guardando durante las consultas

### ❌ Error 2: Session Checkpoints (ALTA PRIORIDAD)
```
GET https://...supabase.co/rest/v1/session_checkpoints?... 406 (Not Acceptable)
```

**Impacto**: Sistema de recuperación de sesiones puede fallar

---

## 🚀 Cómo Aplicar la Migración

### Opción 1: Supabase CLI (Recomendado)

```bash
# 1. Asegurarse de estar en la carpeta del proyecto
cd c:\Users\admin\Dropbox\Ai\cabo-health-nova

# 2. Aplicar la migración a producción
npx supabase db push
```

### Opción 2: Dashboard de Supabase (Manual)

1. Ir a: https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc
2. Click en **SQL Editor** en el menú izquierdo
3. Abrir el archivo `supabase/migrations/20250122_fix_rls_audio_storage.sql`
4. Copiar TODO el contenido
5. Pegarlo en el SQL Editor
6. Click en **Run**

---

## ✅ Verificación

Después de aplicar la migración, verificar:

### 1. Test de Audio Upload
- Iniciar una nueva consulta
- Hablar con Nova
- **NO DEBE aparecer**: `Error al subir audio WAV`
- Verificar en la consola que los uploads son exitosos

### 2. Test de Session Checkpoints
- Recargar la página durante una consulta
- **DEBE aparecer**: Modal de "Recuperar Sesión"
- **NO DEBE aparecer**: Error 406

### 3. Verificar en Supabase Dashboard

**Storage Bucket:**
- Ir a: Storage → consultation-audio
- Verificar que hay archivos `.wav` recientes
- Intentar reproducir uno de los archivos

**Session Checkpoints Table:**
- Ir a: Table Editor → session_checkpoints
- Verificar que hay registros recientes
- Confirmar que `user_id` coincide con el usuario autenticado

---

## 📋 Qué Hace la Migración

### Para `consultation-audio` Bucket:
✅ Crea 4 políticas de storage para usuarios autenticados:
- **INSERT**: Subir fragmentos de audio (arregla error 400)
- **SELECT**: Leer archivos de audio
- **UPDATE**: Actualizar archivos existentes
- **DELETE**: Limpiar archivos antiguos

### Para `session_checkpoints` Table:
✅ Crea 4 políticas RLS para usuarios autenticados:
- **SELECT**: Leer checkpoints propios (arregla error 406)
- **INSERT**: Crear nuevos checkpoints
- **UPDATE**: Actualizar checkpoints existentes
- **DELETE**: Limpiar checkpoints completados

### Seguridad:
🔒 Todas las políticas verifican:
- Usuario está autenticado (`TO authenticated`)
- Usuario solo accede a sus propios datos (`auth.uid() = user_id`)

---

## 🆘 Troubleshooting

### Si `npx supabase db push` falla:

**Error: "No project linked"**
```bash
npx supabase link --project-ref cozsoshuctvhvdbmkmwc
```

**Error: "Authentication failed"**
```bash
npx supabase login
```

**Error: "Migration already applied"**
- ✅ Esto está bien, significa que la migración ya se aplicó
- Verificar que los errores desaparecieron

### Si los errores persisten:

1. **Verificar políticas en Dashboard**:
   - Storage → Policies → consultation-audio
   - Table Editor → session_checkpoints → Policies

2. **Hard refresh del navegador**:
   - Chrome/Edge: `Ctrl + Shift + R`
   - Firefox: `Ctrl + F5`

3. **Limpiar caché de Supabase**:
   ```bash
   # Logout y login de nuevo
   npx supabase logout
   npx supabase login
   ```

---

## 📊 Antes vs Después

### Antes ❌
```
Console:
- Error al subir audio WAV: StorageApiError [x10]
- 406 Not Acceptable session_checkpoints [x5]
- Audio NO guardado en Supabase
- Checkpoints fallando
```

### Después ✅
```
Console:
- ✓ Audio uploaded successfully
- ✓ Checkpoint saved
- ✓ Session recoverable
- Audio guardado en: consultation-audio/*.wav
```

---

## 📝 Notas Adicionales

- **Tiempo de aplicación**: < 5 segundos
- **Downtime**: 0 segundos (migración es safe)
- **Rollback**: No necesario (solo añade políticas, no modifica datos)
- **Compatible con**: Todas las versiones de Supabase

---

**Archivo de migración**: `supabase/migrations/20250122_fix_rls_audio_storage.sql`

**Estado**: ⏳ Pendiente de aplicar
