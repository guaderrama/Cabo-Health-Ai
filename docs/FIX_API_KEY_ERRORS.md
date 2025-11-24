# Corrección de Errores de API Key - Gemini

## Problema Identificado

La aplicación estaba buscando la API key de Gemini de forma incorrecta:

1. **Frontend (App.tsx)**: Intentaba leer `import.meta.env.GEMINI_API_KEY` que **NO funciona en Vite**
   - Vite solo expone variables de entorno con prefijo `VITE_`
   - Esto causaba que la aplicación no detectara la API key correctamente

2. **Edge Function**: Mensaje de error inconsistente ("AI_KEY" vs "GEMINI_API_KEY")

3. **Fallback hardcodeado**: Tenía una API key hardcodeada como fallback, lo cual es un riesgo de seguridad

## Correcciones Aplicadas

### ✅ Frontend (src/App.tsx)

**Antes:**
```typescript
const apiKey = import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || 'HARDCODED_KEY';
```

**Después:**
```typescript
// Vite solo expone variables con prefijo VITE_
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey || apiKey.trim() === '') {
  throw new Error('VITE_GEMINI_API_KEY no está configurada en las variables de entorno');
}
```

**Cambios en 3 ubicaciones:**
- Línea 104: Validación inicial de API key
- Línea 316: Generación de resumen SOAP
- Línea 420: Conexión de audio en vivo

### ✅ Edge Function (supabase/functions/generate-summary/index.ts)

**Antes:**
```typescript
if (!geminiApiKey) {
  throw new Error('AI_KEY no configurada');
}
```

**Después:**
```typescript
if (!geminiApiKey || geminiApiKey.trim() === '') {
  throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno de Supabase. Por favor, configúrala en el Dashboard de Supabase > Settings > Environment Variables');
}
```

### ✅ Mejoras en Manejo de Errores

- Mensajes de error más descriptivos y específicos
- Detección de errores relacionados con API key (401, 403, etc.)
- Mejor logging para debugging

## Configuración Requerida

### Frontend (.env en la raíz del proyecto)

```env
VITE_GEMINI_API_KEY=tu_api_key_de_gemini_aqui
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### Backend (Supabase Dashboard)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto `cozsoshuctvhvdbmkmwc`
3. Ve a **Settings** → **Environment Variables**
4. Añade:
   ```
   GEMINI_API_KEY=tu_api_key_de_gemini_aqui
   ```

## Cómo Verificar que Funciona

### 1. Verificar Variables Frontend
```bash
# En la raíz del proyecto
cat .env | grep VITE_GEMINI_API_KEY
```

### 2. Verificar Variables Backend
- Ve a Supabase Dashboard → Settings → Environment Variables
- Verifica que `GEMINI_API_KEY` esté configurada

### 3. Probar la Aplicación
1. Inicia el servidor: `pnpm dev`
2. Abre la aplicación en el navegador
3. Verifica que NO aparezca el mensaje de error de API key
4. Intenta iniciar una sesión de consulta

### 4. Revisar Consola del Navegador
- Abre DevTools (F12)
- Ve a la pestaña Console
- No debería haber errores relacionados con "API key" o "GEMINI_API_KEY"

## Troubleshooting

### Error: "VITE_GEMINI_API_KEY no está configurada"

**Causa**: La variable no está en el archivo `.env` o no tiene el prefijo `VITE_`

**Solución**:
1. Crea/edita el archivo `.env` en la raíz del proyecto
2. Añade: `VITE_GEMINI_API_KEY=tu_key_aqui`
3. Reinicia el servidor de desarrollo (`pnpm dev`)

### Error: "GEMINI_API_KEY no está configurada" (Edge Function)

**Causa**: La variable no está configurada en Supabase Dashboard

**Solución**:
1. Ve a Supabase Dashboard → Settings → Environment Variables
2. Añade `GEMINI_API_KEY` con tu API key
3. Las Edge Functions se actualizan automáticamente

### La API Key funciona pero la app sigue mostrando error

**Causa**: El servidor de desarrollo necesita reiniciarse para cargar nuevas variables

**Solución**:
1. Detén el servidor (`Ctrl + C`)
2. Reinicia: `pnpm dev`
3. Recarga la página en el navegador

## Notas de Seguridad

- ✅ **Eliminado**: Fallback hardcodeado de API key
- ✅ **Mejorado**: Validación estricta de variables de entorno
- ✅ **Documentado**: Instrucciones claras de configuración
- ⚠️ **Recordatorio**: Nunca commits el archivo `.env` con API keys reales

## Referencias

- [Documentación de Vite - Variables de Entorno](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase - Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Gemini API - Getting Started](https://ai.google.dev/docs)

---
*Corrección aplicada: 2025-01-03*












