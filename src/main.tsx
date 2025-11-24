import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { initErrorTracking } from './lib/errorTracking'

// Inicializar error tracking (solo en producción)
initErrorTracking();

// Error handler global para prevenir crashes por módulos externos faltantes
window.addEventListener('error', (event) => {
  // Prevenir errores de módulos opcionales/externos que no existen
  if (event.filename?.includes('share-modal') ||
      event.message?.includes('share-modal') ||
      event.message?.includes('addEventListener') && event.message?.includes('null')) {
    event.preventDefault();
    console.warn('⚠️ Error de módulo externo ignorado:', event.message);
    return false;
  }

  // Prevenir errores de extensiones del navegador
  if (event.filename?.includes('extension://') ||
      event.filename?.includes('solanaActions') ||
      event.message?.includes('runtime.lastError')) {
    event.preventDefault();
    console.warn('⚠️ Error de extensión del navegador ignorado');
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
