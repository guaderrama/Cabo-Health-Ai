import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { initErrorTracking } from './lib/errorTracking'
import { logger } from './lib/logger'

// Validate required environment variables at startup
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_GEMINI_API_KEY'] as const;
const missingVars = requiredEnvVars.filter(key => !import.meta.env[key]);

if (missingVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}. Check your .env file.`;
  logger.error(errorMsg);
  // In development, show a visible error
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="padding: 20px; background: #fee2e2; color: #991b1b; font-family: monospace; border-radius: 8px; margin: 20px;">
        <h2>⚠️ Environment Configuration Error</h2>
        <p>${errorMsg}</p>
        <p>Create a <code>.env</code> file with the required variables.</p>
      </div>
    `;
    throw new Error(errorMsg);
  }
}

// Inicializar error tracking (solo en producción)
initErrorTracking();

// Error handler global para prevenir crashes por módulos externos faltantes
window.addEventListener('error', (event): void => {
  const message = event.message || '';
  const filename = event.filename || '';

  // Prevenir errores de módulos opcionales/externos que no existen
  if (filename.includes('share-modal') ||
      message.includes('share-modal') ||
      (message.includes('addEventListener') && message.includes('null'))) {
    event.preventDefault();
    logger.warn('Error de módulo externo ignorado:', message);
    return;
  }

  // Prevenir errores de extensiones del navegador
  if (filename.includes('extension://') ||
      filename.includes('solanaActions') ||
      message.includes('runtime.lastError')) {
    event.preventDefault();
    logger.warn('Error de extensión del navegador ignorado');
    return;
  }

  // Prevenir errores de bibliotecas externas (ej: @google/genai)
  // El error "Cannot read properties of undefined (reading '0')" ocurre en código minificado
  if (message.includes("Cannot read properties of undefined (reading '0')") ||
      message.includes('Cannot read properties of null')) {
    event.preventDefault();
    logger.warn('Error de acceso a propiedad ignorado (biblioteca externa):', message);
    return;
  }

  // Prevenir errores de políticas de permisos (microphone, camera, etc.)
  if (message.includes('permissions policy') ||
      message.includes('not allowed in this document')) {
    event.preventDefault();
    logger.warn('Violación de política de permisos ignorada');
    return;
  }
});

// Handler para promesas no manejadas (errores async)
window.addEventListener('unhandledrejection', (event): void => {
  const reason = event.reason;
  const message = reason?.message || String(reason);

  // Ignorar errores de extensiones del navegador
  if (message.includes('runtime.lastError') ||
      message.includes('message channel closed') ||
      message.includes('Extension context invalidated')) {
    event.preventDefault();
    return;
  }

  // Ignorar errores de permisos de micrófono (se manejan en la UI)
  if (message.includes('Permission denied') ||
      message.includes('NotAllowedError') ||
      message.includes('microphone')) {
    event.preventDefault();
    logger.warn('Error de permisos ignorado (se maneja en UI)');
    return;
  }

  // Ignorar errores de acceso a propiedades de bibliotecas externas
  if (message.includes("Cannot read properties of undefined") ||
      message.includes('Cannot read properties of null') ||
      message.includes("reading '0'")) {
    event.preventDefault();
    logger.warn('Error de biblioteca externa ignorado:', message);
    return;
  }

  // Ignorar errores de política de permisos
  if (message.includes('permissions policy') ||
      message.includes('not allowed')) {
    event.preventDefault();
    return;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
