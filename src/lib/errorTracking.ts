import * as Sentry from '@sentry/react';
import { logger } from './logger';

/**
 * Inicializa el sistema de error tracking con Sentry
 * Solo se activa en producción si se provee un DSN
 */
export const initErrorTracking = (): void => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Solo inicializar en producción y si existe DSN
  if (dsn && import.meta.env.PROD) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,

      // Capturar errores de red y performance
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Solo grabar sesiones con errores (privacidad HIPAA)
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Tasa de muestreo de performance
      tracesSampleRate: 0.1, // 10% de transacciones

      // Tasa de muestreo de session replay (solo errores)
      replaysSessionSampleRate: 0, // No grabar sesiones normales
      replaysOnErrorSampleRate: 1.0, // Grabar 100% de sesiones con error

      // Filtrar información sensible
      beforeSend(event, hint) {
        // Remover información médica sensible de los eventos
        if (event.request?.data) {
          // No enviar datos de pacientes
          delete event.request.data;
        }

        // Sanitizar URLs que puedan contener IDs de pacientes
        if (event.request?.url) {
          event.request.url = event.request.url.replace(/\/patients\/\d+/, '/patients/[REDACTED]');
        }

        return event;
      },
    });

    logger.info('✅ Sentry error tracking initialized');
  } else {
    logger.debug('Sentry disabled:', dsn ? 'not in production' : 'DSN not configured');
  }
};

/**
 * Captura manualmente una excepción
 */
export const captureError = (error: Error, context?: Record<string, unknown>): void => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error('Error captured:', error, context);
  }
};

/**
 * Registra un mensaje informativo
 */
export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info'): void => {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level);
  } else {
    console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](`[${level}] ${message}`);
  }
};

/**
 * Establece información del usuario para tracking (sin PHI - Protected Health Information)
 */
export const setUserContext = (userId: string | null, email?: string): void => {
  if (import.meta.env.PROD && userId) {
    Sentry.setUser({
      id: userId,
      email: email || undefined,
    });
  }
};

/**
 * Limpia información del usuario al cerrar sesión
 */
export const clearUserContext = (): void => {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
};
