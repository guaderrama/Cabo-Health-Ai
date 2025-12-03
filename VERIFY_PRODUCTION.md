# Guía de Verificación de Producción

## 1. Estado del Despliegue
- **Código**: Subido a GitHub (v1.2.0)
- **Plataforma**: Vercel
- **URL**: https://cabo-health-nova.vercel.app/

## 2. Pasos para Verificar
1. Abre https://cabo-health-nova.vercel.app/
2. **Visualizador**: Deberías ver el nuevo "Medical Orb" (luminoso, no negro).
3. **Login**: Intenta iniciar sesión.
   - Si falla, verifica la configuración de Supabase (ver abajo).
4. **Nova**: Inicia una sesión médica.
   - Nova debería saludar automáticamente en 1-2 segundos.

## 3. Configuración Crítica (Supabase)
Para que el login funcione en producción, debes autorizar el dominio en Supabase:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** > **URL Configuration**
4. En **Site URL**, pon: `https://cabo-health-ai.vercel.app`
5. En **Redirect URLs**, agrega: `https://cabo-health-ai.vercel.app/**`
6. Guarda los cambios.

## 4. Uso de Vercel CLI (Opcional)
He instalado Vercel CLI. Si deseas usarlo para gestionar el proyecto desde la terminal:

1. Ejecuta: `npx vercel login`
2. Sigue las instrucciones (selecciona GitHub o Email).
3. Una vez logueado, puedes usar comandos como:
   - `npx vercel logs` (ver logs en vivo)
   - `npx vercel deploy` (desplegar manualmente)
