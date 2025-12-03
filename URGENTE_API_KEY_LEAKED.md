# 🚨 ACCIÓN URGENTE REQUERIDA: API Key Comprometida

Google ha detectado que tu API Key de Gemini se filtró públicamente (probablemente en un commit anterior) y la ha bloqueado por seguridad.

## Error Detectado
`Session closed by server: 1008 Your API key was reported as leaked. Please use another API key.`

## Pasos para Solucionar (5 Minutos)

1. **Generar Nueva API Key**:
   - Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Crea una nueva API Key.

2. **Actualizar en Vercel (Producción)**:
   - Ve a tu proyecto en Vercel > Settings > Environment Variables.
   - Busca `VITE_GEMINI_API_KEY`.
   - Edítala y pega la **NUEVA** clave.
   - Guarda los cambios.
   - **IMPORTANTE**: Ve a "Deployments" y haz "Redeploy" para que tome la nueva clave.

3. **Actualizar Localmente (Desarrollo)**:
   - Abre el archivo `.env` en tu computadora.
   - Reemplaza la clave vieja con la nueva.

## ¿Por qué pasó esto?
Es posible que el archivo `.env` se haya subido al repositorio en algún momento o que la clave haya quedado expuesta en el código cliente. Vercel protege las variables, pero si Google detecta la clave en un repositorio público (GitHub), la bloquea automáticamente.

**Nota**: El resto de la app (Visualizador, Saludo Automático) está funcionando bien (veo el log `✅ Audio de activación enviado`), pero la conexión se corta inmediatamente por el bloqueo de seguridad.
