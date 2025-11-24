# 🚀 SOLUCIÓN RÁPIDA (5 MINUTOS)

## El Problema

El error "Invalid API key" aparece porque **Google desactivó la API key**.

**Razón**: La API key fue detectada en un repositorio público y Google la revocó por seguridad.

---

## La Solución (5 pasos)

### 1️⃣ Obtener Nueva API Key (2 min)

1. Abre: https://aistudio.google.com/apikey
2. Haz clic en **"Create API Key"**
3. Copia la nueva key (empieza con `AIzaSy...`)

### 2️⃣ Actualizar .env (30 seg)

Abre: `C:\Users\admin\Dropbox\Ai\cabo-health-nova\.env`

Cambia esta línea:
```env
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

Por:
```env
VITE_GEMINI_API_KEY=TU_NUEVA_KEY_AQUI
```

Guarda el archivo.

### 3️⃣ Reconstruir la App (1 min)

Abre PowerShell/Terminal y ejecuta:

```bash
cd "C:\Users\admin\Dropbox\Ai\cabo-health-nova"

# Limpiar build anterior
rm -rf dist

# Reconstruir
npm run build
```

### 4️⃣ Probar la Nueva Key (30 seg)

```bash
node test-api-from-env.mjs
```

**Deberías ver**:
```
✅ Modelos disponibles: 50
✅ Respuesta: API is working correctly
✅ ¡TODAS LAS PRUEBAS PASARON!
```

Si ves errores, la nueva key puede estar incorrecta. Verifica que la copiaste completa.

### 5️⃣ Iniciar Servidor (30 seg)

```bash
npm run preview
```

Abre: http://localhost:9000

**El error "Invalid API key" debe haber desaparecido.**

---

## Verificación Rápida

### En el Navegador

1. Abre http://localhost:9000
2. Regístrate o inicia sesión
3. Intenta usar el chat médico
4. ✅ Debe funcionar sin errores

### En la Consola del Navegador

1. Presiona F12
2. Ve a Console
3. Escribe: `import.meta.env.VITE_GEMINI_API_KEY`
4. Deberías ver tu nueva API key (no la antigua)

---

## Si Algo Salió Mal

### Error: "API key not valid"

**Causa**: La nueva key no es válida o no la copiaste completa.

**Solución**:
1. Verifica que copiaste TODA la key (39 caracteres)
2. No debe tener espacios al inicio o final
3. Debe empezar con `AIzaSy`
4. Prueba crear otra key nueva

### Error: "VITE_GEMINI_API_KEY is not defined"

**Causa**: El servidor no se reinició.

**Solución**:
```bash
# Detener el servidor (Ctrl+C)
# Volver a construir
npm run build
npm run preview
```

### El servidor no inicia

**Causa**: Puerto 9000 ocupado.

**Solución**:
```bash
# Windows - matar procesos en puerto 9000
netstat -ano | findstr :9000
taskkill /PID <PID> /F

# Volver a intentar
npm run preview
```

---

## Notas Importantes

### ⚠️ NO hagas esto:

- ❌ No commitees el archivo `.env` a Git
- ❌ No compartas tu API key en documentación
- ❌ No subas la carpeta `dist/` a GitHub

### ✅ SÍ haz esto:

- ✅ Guarda tu API key en un lugar seguro (1Password, LastPass, etc.)
- ✅ Usa variables de entorno en producción (Vercel, Netlify)
- ✅ Rota tu API key cada 3-6 meses

---

## Comandos de Referencia Rápida

```bash
# Test de API key
node test-api-from-env.mjs

# Rebuild completo
rm -rf dist && npm run build

# Iniciar servidor de producción
npm run preview

# Iniciar servidor de desarrollo
npm run dev

# Ver variables de entorno
cat .env
```

---

## Ayuda Adicional

### Diagnóstico Completo en el Navegador
http://localhost:9000/diagnose-api-error.html

### Documentación Detallada
- `RESUMEN_PROBLEMA_API_KEY.md` - Resumen ejecutivo
- `DIAGNOSTICO_API_KEY_PROBLEMA.md` - Análisis técnico
- `COMO_DIAGNOSTICAR_API_ERROR.md` - Guía de diagnóstico manual

---

## Resumen Visual

```
┌──────────────────────────────┐
│ 1. Obtener nueva API key     │  → 2 min
├──────────────────────────────┤
│ 2. Actualizar .env           │  → 30 seg
├──────────────────────────────┤
│ 3. npm run build             │  → 1 min
├──────────────────────────────┤
│ 4. node test-api-from-env    │  → 30 seg
├──────────────────────────────┤
│ 5. npm run preview           │  → 30 seg
└──────────────────────────────┘
         TOTAL: 5 minutos
              ↓
    ✅ Problema resuelto
```

---

**¿Necesitas ayuda?** Consulta `COMO_DIAGNOSTICAR_API_ERROR.md` para diagnóstico paso a paso.

**Última actualización**: 2025-11-16
