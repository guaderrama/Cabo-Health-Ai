# Cómo Diagnosticar el Error "Invalid API key"

## Problema Actual

El usuario reporta que sigue viendo el error "Invalid API key" en http://localhost:9000, pero nuestros tests del servidor muestran que la API key correcta está en el build.

## Estado Verificado del Build

✅ **API Key en .env**: `AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4`
✅ **API Key en build**: Confirmado que está en `dist/assets/index-DzbxnDIY.js`
✅ **Vite configurado**: Variables con prefijo `VITE_` se exponen correctamente

## Método 1: Usar la Herramienta de Diagnóstico (RECOMENDADO)

### Paso 1: Iniciar el servidor de desarrollo o producción

```bash
# Opción A: Servidor de desarrollo
npm run dev

# Opción B: Build de producción + servidor
npm run build
npm run preview
```

### Paso 2: Abrir la herramienta de diagnóstico

Navega a: **http://localhost:9000/diagnose-api-error.html**

(O en dev: **http://localhost:3000/diagnose-api-error.html**)

### Paso 3: Ejecutar el diagnóstico

1. Haz clic en **"🚀 Ejecutar Diagnóstico Completo"**
2. Espera a que termine (toma ~5-10 segundos)
3. Revisa TODOS los resultados:

   - ✅ Variables de Entorno
   - ❌ Errores de Consola Capturados
   - 🌐 Errores de Red
   - 📦 Archivos JavaScript Cargados
   - 🔑 API de Gemini - Test Directo
   - 🌐 Información del Navegador

### Paso 4: Capturar la información

**COPIA TODO** el contenido de la página y pégalo aquí o en un archivo de texto.

Especialmente importante:
- Cualquier error con "Invalid API key"
- Stack traces completos
- El resultado del test de API de Gemini
- Los archivos JavaScript que se cargaron

## Método 2: Usar Chrome DevTools Manualmente

### Paso 1: Abrir Chrome DevTools

1. Navega a http://localhost:9000
2. Presiona `F12` o `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
3. Ve a la pestaña **Console**

### Paso 2: Verificar variables de entorno

En la consola, ejecuta:

```javascript
// Verificar la API key
console.log('API Key:', import.meta.env.VITE_GEMINI_API_KEY);

// Ver todas las variables
console.log('Todas las env vars:', import.meta.env);
```

**Copia el resultado exacto aquí.**

### Paso 3: Verificar archivos cargados

1. Ve a la pestaña **Network** (Red)
2. Recarga la página (`Ctrl+R` o `Cmd+R`)
3. Busca el archivo JavaScript principal (debería ser `index-DzbxnDIY.js`)
4. Haz clic en él
5. Ve a la pestaña **Response** o **Preview**
6. Busca la string `AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4`

**¿Está presente la API key en el archivo JavaScript?**

### Paso 4: Capturar errores

1. Quédate en la pestaña **Console**
2. Borra la consola (icono de 🚫 o `Ctrl+L`)
3. Intenta registrarte o usar la funcionalidad que da error
4. **COPIA TODO** el contenido de la consola:
   - Mensajes de error en rojo
   - Stack traces completos
   - Warnings en amarillo
   - Cualquier mensaje que mencione "API" o "Invalid"

### Paso 5: Verificar errores de red

1. Ve a la pestaña **Network**
2. Filtra por "Fetch/XHR"
3. Busca requests a `generativelanguage.googleapis.com`
4. Si hay alguno en rojo (error), haz clic en él
5. Ve a las pestañas:
   - **Headers**: Copia los request headers
   - **Payload**: Copia el body del request
   - **Response**: Copia la respuesta completa

**Pega toda esta información aquí.**

## Método 3: Test Manual de API con Fetch

En la consola de Chrome DevTools, ejecuta este código:

```javascript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

console.log('Testing API with key:', apiKey);

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        contents: [{
            parts: [{
                text: 'Hello, this is a test.'
            }]
        }]
    })
})
.then(response => {
    console.log('Response status:', response.status);
    return response.json();
})
.then(data => {
    console.log('Response data:', data);
})
.catch(error => {
    console.error('Error:', error);
});
```

**Copia TODA la salida de la consola después de ejecutar este código.**

## Posibles Causas del Error

### 1. API Key Inválida o Revocada

**Síntoma**: El build tiene la key, pero Google la rechaza.

**Solución**: Obtener una nueva API key:
1. Ve a https://aistudio.google.com/apikey
2. Crea una nueva API key
3. Actualiza `.env`:
   ```bash
   VITE_GEMINI_API_KEY=tu_nueva_key_aqui
   ```
4. Rebuild:
   ```bash
   npm run build
   npm run preview
   ```

### 2. Caché del Navegador

**Síntoma**: El navegador sigue usando archivos viejos.

**Solución**:
1. Presiona `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac) para hard reload
2. O abre DevTools → Network → marca "Disable cache"
3. Recarga la página

### 3. Variables de Entorno No Se Cargan

**Síntoma**: `import.meta.env.VITE_GEMINI_API_KEY` es `undefined`.

**Solución**:
1. Verifica que `.env` existe en la raíz del proyecto
2. Verifica que la variable empieza con `VITE_`
3. Reinicia el servidor:
   ```bash
   # Detener servidor (Ctrl+C)
   # Iniciar de nuevo
   npm run dev
   # O
   npm run preview
   ```

### 4. Build Viejo

**Síntoma**: El servidor sirve un build anterior.

**Solución**:
```bash
# Limpiar build anterior
rm -rf dist

# Rebuild
npm run build

# Servir build nuevo
npm run preview
```

### 5. Puerto Incorrecto

**Síntoma**: Estás accediendo a un servidor diferente.

**Verificar**:
- ¿En qué puerto está corriendo? (debería ser 9000 para preview, 3000 para dev)
- ¿Hay múltiples servidores corriendo?

**Solución**:
```bash
# Matar todos los procesos de Node
# Windows:
taskkill /F /IM node.exe

# Linux/Mac:
pkill node

# Iniciar servidor limpio
npm run build
npm run preview
```

## Información Necesaria para el Diagnóstico

Por favor proporciona:

1. ✅ Output completo de la herramienta de diagnóstico (`diagnose-api-error.html`)
2. ✅ Valor de `import.meta.env.VITE_GEMINI_API_KEY` en la consola
3. ✅ Errores completos de la consola (con stack traces)
4. ✅ Errores de red (Network tab)
5. ✅ Resultado del test manual de API (fetch)
6. ✅ En qué puerto estás accediendo (3000 o 9000)
7. ✅ Qué comando usaste para iniciar el servidor (`npm run dev` o `npm run preview`)

## Acceso Rápido

- **Herramienta de Diagnóstico**: http://localhost:9000/diagnose-api-error.html
- **App Principal**: http://localhost:9000
- **Test de Variables**: http://localhost:9000/check-env.html
- **Test de API**: http://localhost:9000/test-api.html

## Próximos Pasos

1. Ejecuta el diagnóstico completo usando `diagnose-api-error.html`
2. Copia TODA la información de la página
3. Si sigues viendo "Invalid API key", prueba obtener una nueva API key de Google
4. Verifica que no hay caché del navegador
5. Asegúrate de estar accediendo al servidor correcto (puerto 9000)

---

**Nota**: La herramienta de diagnóstico captura automáticamente:
- Todos los errores de JavaScript
- Errores de red (fetch/XHR)
- Variables de entorno
- Archivos cargados
- Test directo de la API de Gemini

Es la forma más rápida y completa de diagnosticar el problema.
