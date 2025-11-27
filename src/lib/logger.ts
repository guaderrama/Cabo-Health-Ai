/**
 * Development-only logger utility
 * All logging is stripped in production builds for cleaner console
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Creates a no-op function for production
 */
const noop = () => {};

/**
 * Creates a logger function that only logs in development
 */
const createLogFn = (level: LogLevel) => {
  if (!isDev) return noop;

  const consoleFn = level === 'debug' ? console.log : console[level];
  return (...args: unknown[]) => consoleFn(...args);
};

/**
 * Development-only logger
 * Usage:
 *   logger.debug('Debug message', data);
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 */
export const logger: Logger = {
  debug: createLogFn('debug'),
  info: createLogFn('info'),
  warn: createLogFn('warn'),
  error: createLogFn('error'),
};

/**
 * Conditional log - only logs if condition is true AND in development
 */
export const logIf = (condition: boolean, ...args: unknown[]): void => {
  if (isDev && condition) {
    console.log(...args);
  }
};

export default logger;
