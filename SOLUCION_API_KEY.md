# 🚨 SOLUCIÓN: API Key Inválida (LEAKED)

## Problema Identificado

Tu API key actual está **BLOQUEADA por Google** porque fue reportada como filtrada (leaked):

```
Error: "Your API key was reported as leaked. Please use another API key."
Status: 403 PERMISSION_DENIED
```

**API Key actual (BLOQUEADA):** `AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4`

## ✅ Solución (5 Pasos)

### 1️⃣ Obtener NUEVA API Key

1. Ve a: **https://aistudio.google.com/apikey**
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Create API key"**
4. Selecciona un proyecto existente o crea uno nuevo
5. **COPIA** la nueva API key completamente (empezará con `AIza...`)

### 2️⃣ Actualizar en tu archivo .env LOCAL

Edita el archivo `.env` en tu proyecto:

```env
# Cambia esta línea:
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4

# Por tu NUEVA API key:
VITE_GEMINI_API_KEY=TU_NUEVA_API_KEY_AQUI
```

**También actualiza:**
```env
GEMINI_API_KEY=TU_NUEVA_API_KEY_AQUI
```

### 3️⃣ Probar localmente

```bash
# Ejecuta el test
node test-api-key.mjs
```

Deberías ver: `✅ ¡API KEY VÁLIDA!`

### 4️⃣ Actualizar en MiniMax Space (Producción)

1. Ve a: **https://minimax.io** (tu panel de control)
2. Abre tu proyecto: **cabo-health-nova**
3. Ve a **Settings** → **Environment Variables**
4. Actualiza la variable:
   - Nombre: `VITE_GEMINI_API_KEY`
   - Valor: `TU_NUEVA_API_KEY_AQUI`
5. **GUARDA** los cambios
6. **Redeploy** el proyecto (puede ser automático)

### 5️⃣ Verificar en Producción

1. Espera 1-2 minutos para que se aplique el cambio
2. Abre: **https://etric4luf0vq.space.minimax.io**
3. Intenta **registrarte** o **iniciar sesión**
4. Deberías poder acceder sin error de API key

## 🔒 Importante: Protege tu API Key

Para evitar que se filtre nuevamente:

1. **NUNCA** compartas tu API key en público
2. **NUNCA** la subas a GitHub u otros repositorios públicos
3. Asegúrate que `.env` esté en `.gitignore`
4. Considera usar **restricciones de API** en Google Cloud Console:
   - Restringe por dominio: `*.minimax.io`
   - Restringe por referrer HTTP

## ⚡ Resumen

| Paso | Acción | Estado |
|------|--------|--------|
| 1 | Obtener nueva API key | ⏳ Por hacer |
| 2 | Actualizar .env local | ⏳ Por hacer |
| 3 | Probar con test-api-key.mjs | ⏳ Por hacer |
| 4 | Actualizar en MiniMax Space | ⏳ Por hacer |
| 5 | Verificar en producción | ⏳ Por hacer |

---

## 📋 Comandos Útiles

```bash
# Probar API key
node test-api-key.mjs

# Iniciar desarrollo local
pnpm dev

# Ver archivo .env
cat .env
```

## 🆘 Si sigues teniendo problemas

1. Verifica que copiaste la API key completa (sin espacios)
2. Asegúrate de guardar el archivo .env
3. Verifica que MiniMax Space haya aplicado los cambios
4. Limpia caché del navegador y recarga la página

---

**Última actualización:** 2025-01-04 02:31 AM
**Estado:** API key actual BLOQUEADA - Se requiere nueva key
