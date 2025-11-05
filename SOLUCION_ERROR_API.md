# 🔧 SOLUCIÓN PARA ERROR DE API DE GEMINI

## 🔴 PROBLEMA: "Error API" aunque hayas configurado nuevas API keys

Este error ocurre porque **el archivo `.env` no existe**. Aunque tengas un `.env.example`, Vite **NO lo lee automáticamente**.

---

## ✅ SOLUCIÓN PASO A PASO (5 MINUTOS)

### Paso 1: Crear el archivo `.env`

```bash
# En la raíz del proyecto (donde está package.json):
cp .env.example .env
```

O crea el archivo manualmente:

```bash
# En la raíz del proyecto:
nano .env
```

### Paso 2: Agregar tu API Key de Gemini

Edita el archivo `.env` y reemplaza la línea:

```bash
VITE_GEMINI_API_KEY=
```

Con tu API key real:

```bash
VITE_GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Paso 3: Obtener una API Key (si no tienes una)

1. Ve a: https://aistudio.google.com/apikey
2. Haz clic en "Create API key"
3. Copia la key que empieza con `AIza...`
4. Pégala en tu archivo `.env`

### Paso 4: **REINICIAR el servidor de desarrollo**

**MUY IMPORTANTE**: Vite solo carga `.env` al iniciar, NO en tiempo real.

```bash
# Detener el servidor (Ctrl+C en la terminal)

# Luego reiniciar:
npm run dev
```

---

## 🧪 VERIFICAR QUE FUNCIONA

### Opción 1: Usar el Diagnóstico Visual en la UI

1. Reinicia el servidor
2. Abre la aplicación en el navegador
3. Si ves el error, haz clic en **"🔍 Ejecutar Diagnóstico"**
4. El diagnóstico te dirá exactamente qué está mal

### Opción 2: Usar el Script de Diagnóstico en Terminal

```bash
# Instalar dotenv si no está instalado:
npm install dotenv

# Ejecutar el diagnóstico:
node scripts/test-gemini-api.js
```

El script te dirá:
- ✅ Si tu API key está configurada
- ✅ Si puede conectarse a Gemini
- ✅ Qué modelos están disponibles
- ❌ Exactamente qué está fallando

---

## 🚨 PROBLEMAS COMUNES

### 1. "API key inválida" (Error 400)

**Causa**: La API key está mal copiada o es incorrecta.

**Solución**:
```bash
# Genera una nueva key en:
https://aistudio.google.com/apikey

# Asegúrate de copiar la key COMPLETA (sin espacios al inicio/final)
# Pégala en .env sin comillas:
VITE_GEMINI_API_KEY=AIzaSyXXXXX...
```

### 2. "Permission denied" (Error 403)

**Causa**: La API key tiene restricciones activas.

**Solución**:
1. Ve a: https://console.cloud.google.com/apis/credentials
2. Encuentra tu API key
3. Edita las restricciones
4. Asegúrate de que "Generative Language API" esté habilitada
5. Genera una nueva key sin restricciones para testing

### 3. "Quota exceeded" (Error 429)

**Causa**: Superaste el límite de uso gratuito.

**Solución**:
- Espera 1-2 minutos y vuelve a intentar
- Verifica tu cuota en: https://aistudio.google.com/
- Considera usar una nueva API key

### 4. El archivo `.env` existe pero no funciona

**Posibles causas**:
1. No reiniciaste el servidor después de crear `.env`
2. El archivo `.env` tiene espacios extra o formato incorrecto
3. Estás usando `.env.local` o `.env.development` (usa solo `.env`)

**Solución**:
```bash
# Verificar contenido del archivo:
cat .env

# Debe verse así (sin espacios antes/después del =):
VITE_GEMINI_API_KEY=AIzaSyXXXXX...

# Reiniciar servidor:
# Ctrl+C para detener
npm run dev
```

### 5. "Model not found"

**Causa**: El modelo `gemini-2.5-flash-native-audio-preview-09-2025` puede no estar disponible en tu región o API key.

**Solución Temporal**:

Edita `src/App.tsx` línea 434 y cambia el modelo a:

```typescript
// Opción 1: Usar modelo estable
model: 'gemini-2.5-flash',

// Opción 2: Usar modelo experimental
model: 'gemini-2.0-flash-exp',
```

**Nota**: Estos modelos NO soportan audio nativo, pero te permitirán probar si la API key funciona.

---

## 📂 ESTRUCTURA DE ARCHIVOS

Tu proyecto debería tener:

```
Cabo-Health-Ai/
├── .env                    ← DEBE EXISTIR (con tu API key)
├── .env.example            ← Template (no se usa en runtime)
├── .gitignore              ← Debe incluir .env
├── package.json
├── src/
│   └── App.tsx
└── ...
```

---

## 🔒 SEGURIDAD

### ⚠️ NUNCA hagas commit de tu `.env`

El archivo `.env` está (debería estar) en `.gitignore`:

```bash
# Verificar:
cat .gitignore | grep .env

# Debe mostrar:
.env
.env.local
.env.production
```

### 🔑 Regenerar API key si fue expuesta

Si accidentalmente subiste tu API key a GitHub:

1. **INMEDIATAMENTE** ve a: https://aistudio.google.com/apikey
2. Elimina la key comprometida
3. Genera una nueva
4. Actualiza tu `.env` con la nueva key
5. Reinicia el servidor

---

## 📝 CHECKLIST FINAL

Antes de pedir ayuda, verifica:

- [ ] El archivo `.env` existe en la raíz del proyecto
- [ ] El archivo `.env` contiene `VITE_GEMINI_API_KEY=AIza...`
- [ ] La API key está correctamente copiada (sin espacios)
- [ ] Reiniciaste el servidor después de crear/editar `.env`
- [ ] Tu API key funciona (probada en https://aistudio.google.com/)
- [ ] No tienes restricciones activas en la API key
- [ ] Ejecutaste el diagnóstico visual o el script de testing

---

## 🆘 ¿AÚN NO FUNCIONA?

Si seguiste todos los pasos y aún tienes errores:

1. **Ejecuta el diagnóstico completo**:
   ```bash
   node scripts/test-gemini-api.js
   ```

2. **Copia el output completo** del diagnóstico

3. **Verifica los logs del navegador**:
   - Abre DevTools (F12)
   - Ve a la pestaña Console
   - Busca errores rojos
   - Copia el mensaje de error completo

4. **Información útil para debug**:
   - Sistema operativo
   - Navegador y versión
   - Mensaje de error exacto
   - Output del script de diagnóstico

---

## 📚 RECURSOS ADICIONALES

- **Obtener API Key**: https://aistudio.google.com/apikey
- **Documentación Gemini API**: https://ai.google.dev/gemini-api/docs
- **Live API Docs**: https://ai.google.dev/gemini-api/docs/live
- **Modelos disponibles**: https://ai.google.dev/gemini-api/docs/models
- **Google Cloud Console**: https://console.cloud.google.com/

---

## 💡 TIP PRO

Crea un script para verificar tu configuración antes de iniciar el servidor:

```bash
# Agregar a package.json scripts:
"predev": "node scripts/test-gemini-api.js"
```

Esto ejecutará automáticamente el diagnóstico cada vez que hagas `npm run dev`.

---

**Última actualización**: Noviembre 2025
**Versión**: 1.0
