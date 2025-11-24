# 🔴 DIAGNÓSTICO: API Key Filtrada y Desactivada

## Problema Identificado

La API key `AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4` fue **reportada como filtrada (leaked)** por Google y ha sido **desactivada**.

### Evidencia del Error

```json
{
  "error": {
    "code": 403,
    "message": "Your API key was reported as leaked. Please use another API key.",
    "status": "PERMISSION_DENIED"
  }
}
```

## Por Qué Pasó Esto

Las API keys fueron expuestas públicamente en:

1. ✅ Archivos de configuración en el repositorio
2. ✅ Documentación con ejemplos
3. ✅ Archivos `.env` que fueron commiteados
4. ✅ Archivos de build (`dist/`) que contienen las keys

**Google escanea GitHub y otros repositorios públicos** en busca de API keys filtradas y las desactiva automáticamente por seguridad.

## Estado Actual

### ✅ Lo que SÍ funciona:
- Build correcto con Vite
- Variables de entorno bien configuradas
- API key correctamente incrustada en el bundle
- Configuración de Supabase funcional

### ❌ Lo que NO funciona:
- La API key fue desactivada por Google
- Cualquier intento de usar Gemini API retorna error 403
- El usuario ve "Invalid API key" aunque la configuración es correcta

## Solución Inmediata

### Paso 1: Obtener una Nueva API Key

1. Ve a: https://aistudio.google.com/apikey
2. Haz clic en "Create API Key"
3. Selecciona tu proyecto de Google Cloud
4. Copia la nueva API key (será algo como `AIzaSy...`)

### Paso 2: Actualizar .env

Edita el archivo `.env` en la raíz del proyecto:

```bash
# ANTES (key filtrada - NO USAR)
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4

# DESPUÉS (tu nueva key)
VITE_GEMINI_API_KEY=AIzaSy_TU_NUEVA_KEY_AQUI
```

### Paso 3: Reconstruir la Aplicación

```bash
# Limpiar build anterior
rm -rf dist

# Reconstruir con la nueva key
npm run build

# Iniciar servidor
npm run preview
```

### Paso 4: Verificar que Funciona

```bash
# Test rápido de la nueva key
node test-api-from-env.mjs
```

Deberías ver:
```
✅ Modelos disponibles: 50
✅ Respuesta: API is working correctly
✅ ¡TODAS LAS PRUEBAS PASARON!
```

## Solución a Largo Plazo: Seguridad de API Keys

### 1. Nunca Commitear API Keys

Asegúrate de que `.env` está en `.gitignore`:

```bash
# Verificar
cat .gitignore | grep .env

# Si no está, añadirlo
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### 2. Usar Variables de Entorno en Producción

Para Vercel/Netlify/Railway:

```bash
# NO hacer esto:
git add .env
git commit -m "Add env"

# SÍ hacer esto:
vercel env add VITE_GEMINI_API_KEY
# Pegar la API key cuando te lo pida
```

### 3. Limpiar Archivos de Documentación

Reemplaza todas las referencias a la API key antigua en:

- `ACTUALIZAR_API_KEY_PRODUCCION.md`
- `OBTENER_API_KEY_GEMINI.md`
- `DEPLOYMENT_QUICK_START.md`
- `docs/*.md`
- `.ai-context/*.md`
- `.clinerules/*.md`

Usa un placeholder:
```bash
VITE_GEMINI_API_KEY=AIzaSy_TU_API_KEY_AQUI
```

### 4. No Incluir dist/ en Git

```bash
# Asegurarse de que dist/ está en .gitignore
echo "dist/" >> .gitignore

# Eliminar dist/ del repositorio si está
git rm -r --cached dist/
git commit -m "Remove dist from git"
```

### 5. Rotar API Keys Regularmente

- Crea una nueva API key cada 3-6 meses
- Elimina las API keys antiguas en Google Cloud Console
- Nunca reutilices API keys que fueron expuestas

## Checklist de Seguridad

- [ ] Obtuve una nueva API key de Google AI Studio
- [ ] Actualicé `.env` con la nueva key
- [ ] Verifiqué que `.env` está en `.gitignore`
- [ ] Reconstruí la aplicación (`npm run build`)
- [ ] Probé que la nueva key funciona (`node test-api-from-env.mjs`)
- [ ] Eliminé referencias a la API key antigua en documentación
- [ ] Verifiqué que `dist/` está en `.gitignore`
- [ ] Configuré variables de entorno en mi plataforma de deployment (Vercel/Netlify)
- [ ] NO commitee la nueva API key al repositorio

## Herramientas de Diagnóstico

### Test rápido de API key:
```bash
node test-api-from-env.mjs
```

### Diagnóstico completo en el navegador:
```
http://localhost:9000/diagnose-api-error.html
```

### Verificar variables de entorno:
```javascript
// En la consola del navegador
console.log(import.meta.env.VITE_GEMINI_API_KEY);
```

## Error vs Causa Real

| Lo que el Usuario Ve | Causa Real |
|----------------------|-----------|
| "Invalid API key" | API key filtrada y desactivada por Google |
| Error 403 Forbidden | Google detectó la key en un repositorio público |
| API key está en el build ✅ | Pero la key fue revocada por seguridad |
| Configuración correcta ✅ | Pero necesita una key válida nueva |

## Mensajes de Error Esperados

### ANTES (con key filtrada):
```json
{
  "error": {
    "code": 403,
    "message": "Your API key was reported as leaked. Please use another API key.",
    "status": "PERMISSION_DENIED"
  }
}
```

### DESPUÉS (con nueva key válida):
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "API is working correctly"
      }]
    }
  }]
}
```

## Próximos Pasos

1. **Inmediato**: Obtener nueva API key y actualizar `.env`
2. **Corto plazo**: Limpiar documentación de referencias a la key antigua
3. **Largo plazo**: Implementar mejores prácticas de seguridad
4. **Deployment**: Configurar variables de entorno en la plataforma de hosting

## Enlaces Útiles

- **Obtener API Key**: https://aistudio.google.com/apikey
- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- **Documentación Gemini API**: https://ai.google.dev/docs
- **Mejores Prácticas**: https://cloud.google.com/docs/authentication/api-keys#securing_an_api_key

---

**Resumen**: El problema NO es la configuración de Vite, ni las variables de entorno, ni el build. El problema es que **Google desactivó la API key porque fue expuesta públicamente**. La solución es obtener una nueva API key y configurar mejores prácticas de seguridad.
