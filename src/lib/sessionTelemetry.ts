/**
 * Sistema de telemetría para diagnóstico de sesiones de Nova
 * Permite monitorear tiempos de respuesta, timeouts y errores
 */

interface SessionMetrics {
  sessionStart: number;
  novaResponseTimes: number[];
  timeouts: number;
  errors: string[];
  reconnects: number;
}

let metrics: SessionMetrics = {
  sessionStart: 0,
  novaResponseTimes: [],
  timeouts: 0,
  errors: [],
  reconnects: 0
};

/**
 * Resetea todas las métricas - llamar al iniciar nueva sesión
 */
export const resetMetrics = () => {
  metrics = {
    sessionStart: Date.now(),
    novaResponseTimes: [],
    timeouts: 0,
    errors: [],
    reconnects: 0
  };
};

/**
 * Registra tiempo de respuesta de Nova
 */
export const logNovaResponse = (responseTime: number) => {
  metrics.novaResponseTimes.push(responseTime);
};

/**
 * Incrementa contador de timeouts
 */
export const logTimeout = () => {
  metrics.timeouts++;
};

/**
 * Registra un error
 */
export const logError = (error: string) => {
  metrics.errors.push(`${new Date().toISOString()}: ${error}`);
};

/**
 * Incrementa contador de reconexiones
 */
export const logReconnect = () => {
  metrics.reconnects++;
};

/**
 * Obtiene todas las métricas con estadísticas calculadas
 */
export const getMetrics = () => {
  const times = metrics.novaResponseTimes;
  return {
    ...metrics,
    avgResponseTime: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
    maxResponseTime: times.length ? Math.max(...times) : 0,
    minResponseTime: times.length ? Math.min(...times) : 0,
    sessionDuration: metrics.sessionStart ? Date.now() - metrics.sessionStart : 0,
    totalResponses: times.length
  };
};

/**
 * Formatea las métricas para mostrar en consola
 */
export const formatMetricsForConsole = () => {
  const m = getMetrics();
  return `
📊 Nova Session Diagnostics
━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️  Session Duration: ${Math.round(m.sessionDuration / 1000)}s
🤖 Nova Responses: ${m.totalResponses}
📈 Avg Response Time: ${m.avgResponseTime}ms
📉 Min Response Time: ${m.minResponseTime}ms
📈 Max Response Time: ${m.maxResponseTime}ms
⏰ Timeouts: ${m.timeouts}
🔄 Reconnects: ${m.reconnects}
❌ Errors: ${m.errors.length}
${m.errors.length > 0 ? '\nRecent Errors:\n' + m.errors.slice(-3).join('\n') : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
};

// Solo visible en dev - exponer en window para debugging
if (import.meta.env.DEV) {
  (window as any).novaMetrics = () => {
    console.log(formatMetricsForConsole());
    return getMetrics();
  };
  console.log('💡 Nova Diagnostics: usa window.novaMetrics() para ver métricas de sesión');
}
