# 🔑 CÓMO OBTENER API KEY VÁLIDA DE GOOGLE GEMINI

**Problema Actual**: La API key en `.env` es inválida

**Error**: "Invalid API key" 

---

## ✅ SOLUCIÓN - Obtener API Key Válida

### Paso 1: Ve a Google AI Studio

Abre en navegador:
```
https://aistudio.google.com/apikey
```

### Paso 2: Crea una Nueva API Key

1. Haz clic en **"Create API key"**
2. Selecciona **"Create API key in new project"** o usa proyecto existente
3. **Google creará automáticamente la API key**
4. Verás un popup con la clave

### Paso 3: Copia la API Key

```
Verás algo como:
AIzaSyD...
(diferentes a la actual)
```

**IMPORTANTE**: Cópiala completa (sin espacios)

---

## 🔐 Actualizar la API Key

### Opción 1: Actualizar en `.env` (Para testing local)

Abre el archivo `.env` en tu proyecto:

```env
# Reemplaza ESTO:
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4

# POR ESTO (con tu nueva clave):
VITE_GEMINI_API_KEY=AIzaSyD... (tu nueva key)
```

También reemplaza:
```env
GEMINI_API_KEY=AIzaSyD... (tu nueva key)
```

Guarda el archivo.

### Opción 2: Actualizar en Supabase (Para producción)

Para que funcione en la app en vivo:

1. Ve a: https://supabase.com/dashboard
2. Proyecto: `cozsoshuctvhvdbmkmwc`
3. Settings → Environment Variables
4. **Edita** `GEMINI_API_KEY`
5. Pega tu nueva clave
6. **Deploy** nuevamente

---

## 🚀 DESPUÉS DE ACTUALIZAR

### Si actualizaste `.env` (testing local):
```bash
# En terminal CMD
cd c:\Users\admin\Dropbox\Ai\cabo-health-nova

# Detén servidor previo (si está corriendo)
# Ctrl+C en la terminal

# Reinicia
npm run dev

# Abre: http://localhost:5173
```

### Si actualizaste en Supabase (producción):
```
1. La app en vivo se actualizará automáticamente
2. O haz deploy manual si es necesario
3. Abre: https://etric4luf0vq.space.minimax.io
```

---

## ✅ VERIFICAR QUE FUNCIONA

1. Abre la app (local o producción)
2. Crea una cuenta
3. Ingresa nombre de paciente
4. Haz clic en Play
5. **NO debe haber error "Invalid API key"**
6. Deberías escuchar sonido de bienvenida

---

## 🐛 SI SIGUE DANDO ERROR

### Paso 1: Verifica que copiaste la clave completa
- La clave debe tener aproximadamente 40 caracteres
- Comienza con `AIzaSy...`

### Paso 2: Verifica que la guardaste correctamente
```bash
# En terminal
type .env | findstr GEMINI
```

Debe mostrar:
```
VITE_GEMINI_API_KEY=AIzaSyD... (tu clave completa)
GEMINI_API_KEY=AIzaSyD... (tu clave completa)
```

### Paso 3: Verifica permisos en Google Cloud
1. Ve a: https://console.cloud.google.com
2. Selecciona el proyecto
3. APIs & Services → Enabled APIs
4. Verifica que **Generative Language API** está habilitada

### Paso 4: Reinicia todo

Para testing local:
```bash
# Detén servidor (Ctrl+C)
# Mata procesos viejos
taskkill /IM node.exe /F

# Limpia cache
del node_modules\.vite\

# Reinicia
npm run dev
```

---

## 📞 OBTENER MÁS DETALLES

### Si necesitas ayuda:

1. **Google Generative AI**: https://ai.google.dev
2. **API Documentation**: https://ai.google.dev/docs
3. **Quota & Limits**: https://aistudio.google.com/app/apikey (aquí ves tus límites)

---

## 🎯 CHECKLIST

- [ ] Abrí https://aistudio.google.com/apikey
- [ ] Creé una nueva API key
- [ ] Copié la clave completa
- [ ] Actualicé `.env` con la nueva clave
- [ ] Guardé el archivo
- [ ] Reinicié servidor (npm run dev)
- [ ] Recargué navegador (Ctrl+Shift+R)
- [ ] El error "Invalid API key" desapareció
- [ ] La app funciona correctamente

---

## ⚠️ NOTAS IMPORTANTES

- ✅ **Gratis**: Google Gemini tiene plan gratuito con límite diario
- ✅ **API Key Pública**: Esta key se usa en el cliente Frontend (es okay que sea pública)
- ✅ **Límites**: Por defecto 60 llamadas por minuto (ajustable en Google Cloud)
- ✅ **No expira**: La key no expira, solo se regenera si la renovas manualmente

---

**Una vez actualices la API key, la app debería funcionar correctamente** ✅

https://aistudio.google.com/apikey ← Abre AHORA
