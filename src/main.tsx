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
  // Prevenir errores de módulos opcionales/externos que no existen
  if (event.filename?.includes('share-modal') ||
      event.message?.includes('share-modal') ||
      (event.message?.includes('addEventListener') && event.message?.includes('null'))) {
    event.preventDefault();
    logger.warn('Error de módulo externo ignorado:', event.message);
    return;
  }

  // Prevenir errores de extensiones del navegador
  if (event.filename?.includes('extension://') ||
      event.filename?.includes('solanaActions') ||
      event.message?.includes('runtime.lastError')) {
    event.preventDefault();
    logger.warn('Error de extensión del navegador ignorado');
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
