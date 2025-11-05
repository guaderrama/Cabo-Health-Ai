# 🚀 Guía Rápida: Corregir y Desplegar Cabo Health Nova

**⏱️ Tiempo estimado**: 15-30 minutos para testing local, 5-10 minutos para deploy

---

## 🎯 En 30 Segundos

Tu aplicación tiene **3 problemas sencillos** con las API keys:

1. **Frontend** → Usa `VITE_GEMINI_API_KEY` ✅ (ya corregido en App.tsx)
2. **Edge Functions** → Usan `GEMINI_API_KEY` ✅ (ya corregido en generate-summary)
3. **Variables de entorno** → Necesitan estar en `.env` y en Supabase Dashboard

**Estado Actual**: ✅ Código listo, solo falta testing y deploy

---

## 📋 PASO 1: Verificar Configuración (2 min)

### 1.1 Verificar archivo `.env`

```bash
# Abre tu terminal en el proyecto
cd c:\Users\admin\Dropbox\Ai\cabo-health-nova

# Verifica que exista .env con las claves:
type .env
```

**Debe tener**:
```env
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **Si existe**: Continuar a PASO 2
❌ **Si NO existe**: Crear `.env` con los valores de arriba

### 1.2 Verificar en Supabase Dashboard

Ve a: https://supabase.com/dashboard

1. Selecciona proyecto: `cozsoshuctvhvdbmkmwc`
2. Ve a Settings → Environment Variables
3. Verifica que existan:
   - `GEMINI_API_KEY` ✅
   - `SERVICE_ROLE_KEY` ✅

Si faltan, agrégalas en el Dashboard.

---

## 🔧 PASO 2: Instalar Dependencias (3 min)

```bash
# Opción A: Con npm (si pnpm no funciona)
npm install

# Opción B: Con node directamente
npm install --no-save

# Verifica que package.json exista
type package.json
```

**Esperado**: Debe crear carpeta `node_modules/` sin errores rojos

---

## ▶️ PASO 3: Ejecutar en Desarrollo (1 min)

### Opción A: Con npm (Recomendado si pnpm no funciona)

```bash
npm run dev
```

### Opción B: Direct node

```bash
node_modules/.bin/vite
```

**Esperado**: 
```
  VITE v6.0.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

✅ Si ves esto, el servidor está corriendo

---

## 🌐 PASO 4: Testing Manual en el Navegador (10 min)

### 4.1 Abrir la App

1. Abre navegador: http://localhost:5173
2. Deberías ver pantalla de LOGIN ✅

**Si ves error de API key rojo**:
- [ ] Verifica `.env` contiene `VITE_GEMINI_API_KEY`
- [ ] Reinicia servidor: Ctrl+C, luego `npm run dev`
- [ ] Recarga página: Ctrl+Shift+R (hard refresh)

### 4.2 Login

Usa credenciales de prueba:
```
Email: test@example.com
Password: (según tu BD de Supabase)
```

**Debug**: Abre DevTools (F12) → Console
- Debe haber logs de Supabase, NO errores rojos

### 4.3 Iniciar una Consulta

1. Ingresa nombre de paciente: "Test Patient"
2. Haz clic en "Iniciar Sesión" (Play button azul)
3. Deberías escuchar sonido de bienvenida
4. Estado debe cambiar a "LISTENING" ✅

**Debug si falla**:
```javascript
// En Console escribe:
console.log('API Key:', import.meta.env.VITE_GEMINI_API_KEY)
// Debe mostrar: AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

**Si ves error "Failed to start session"**:
- [ ] Verifica que .env tenga `VITE_GEMINI_API_KEY`
- [ ] Verifica permisos de micrófono (navegador pedirá permiso)
- [ ] Prueba en YouTube si micrófono funciona

### 4.4 Hablar con IA

1. Habla algo al micrófono
2. Deberías ver tu texto en "Transcripción" ✅
3. Escucha la respuesta de audio (en español)
4. Ve la respuesta en "Transcripción"

**Debug en Console**:
```javascript
// Busca logs de eventos
// Debe haber: "Input transcription received", etc.
```

### 4.5 Terminar y Generar Resumen

1. Haz clic en "Terminar Sesión" (Stop button rojo)
2. Sistema debe generar resumen SOAP automáticamente
3. Deberías ver HTML formateado con S-O-A-P ✅

**Si resumen tarda o falla**:
- [ ] Verifica en Console si hay error de "generate-summary"
- [ ] Abre Supabase Dashboard → Functions → generate-summary
- [ ] Mira los logs de la función
- [ ] Verifica que GEMINI_API_KEY esté configurada en Supabase

---

## 🐛 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "VITE_GEMINI_API_KEY no está configurada" | Verifica `.env`, reinicia servidor |
| "Failed to connect to Gemini" | API key inválida o Gemini API caída |
| "Edge Function returned 500" | Verifica GEMINI_API_KEY en Supabase Dashboard |
| No se escucha audio | Verifica micrófono + permisos del navegador |
| Resumen no se genera | Abre Supabase → Functions → Logs |

---

## 🗂️ Documentación Disponible

He creado estos archivos para análisis profundo:

1. **`docs/ANALISIS_PROYECTO_COMPLETO.md`** - Análisis detallado (READ ME!)
2. **`docs/SUPABASE_ANALYSIS.md`** - Estado de BD y Edge Functions
3. **`docs/FIX_API_KEY_ERRORS.md`** - Problemas de API corregidos

---

## 🚀 DEPLOYMENT (Cuando testing local funcione)

### Opción 1: Vercel (5 minutos - RECOMENDADO)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Vercel pedirá:
#    - Confirmar proyecto
#    - Configurar variables de entorno
```

**Variables a configurar en Vercel**:
```
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Opción 2: Netlify (5 minutos)

```bash
# 1. Conectar repo
netlify connect

# 2. Build settings:
# Build command: npm run build
# Publish directory: dist

# 3. Configurar variables en Netlify UI
```

### Opción 3: GitHub Pages (10 minutos)

```bash
# 1. Build
npm run build

# 2. Los archivos están en dist/
# 3. Deploy dist/ a GitHub Pages
```

---

## ✅ Checklist Final

**Local Development**:
- [ ] `npm install` sin errores
- [ ] `npm run dev` corre en http://localhost:5173
- [ ] Puedo ver login
- [ ] Puedo login
- [ ] Puedo iniciar consulta (escucho audio de bienvenida)
- [ ] Puedo hablar y recibir respuesta
- [ ] Se genera resumen SOAP
- [ ] Resumen se guarda en BD

**Production**:
- [ ] Build: `npm run build` sin errores
- [ ] `dist/` creada correctamente
- [ ] Variables de entorno configuradas en hosting
- [ ] Deploy ejecutado
- [ ] URL funciona: https://tu-dominio.com
- [ ] Testing en producción - mismos pasos que local

---

## 🆘 ¿Algo No Funciona?

**Usa esta información**:

1. **Abre DevTools (F12) en navegador**
   - Console → Busca errores rojos
   - Network → Verifica llamadas a Gemini y Supabase

2. **Verifica Supabase Dashboard**
   - Functions → Mira logs de generate-summary
   - Table Editor → Verifica que session_checkpoints se creen

3. **Verifica .env**
   ```bash
   type .env
   ```
   Debe tener todas las claves, sin vacías

4. **Ejecuta build**
   ```bash
   npm run build
   ```
   Si hay errores TypeScript, necesitamos corregirlos

---

## 📞 Próximos Pasos

1. ✅ Ejecuta: `npm run dev`
2. ✅ Prueba en http://localhost:5173
3. ✅ Si funciona, sigue DEPLOYMENT
4. ✅ Si hay error, dame el mensaje exacto

**Document**: Revisa `docs/ANALISIS_PROYECTO_COMPLETO.md` para comprensión profunda

---

**¿Listo para empezar? ¡Ejecuta tu primer `npm run dev`!** 🎉
