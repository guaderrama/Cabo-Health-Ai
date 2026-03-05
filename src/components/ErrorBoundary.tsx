import React, { Component, ReactNode, ErrorInfo } from 'react';
import { captureError } from '../lib/errorTracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const serializeError = (error: any): string => {
  if (error instanceof Error) {
    return error.message + (error.stack ? '\n' + error.stack : '');
  }
  return JSON.stringify(error, null, 2);
};

/**
 * ErrorBoundary - Componente que captura errores de JavaScript en su árbol de componentes
 * Muestra una UI de respaldo en caso de error en lugar de romper toda la aplicación
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar estado para mostrar UI de respaldo
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log del error a servicio de reporte
    // Error boundary logging - captured by error tracking service

    // Reportar a Sentry (solo en producción)
    captureError(error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Llamar callback si se provee
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Renderizar fallback personalizado o UI por defecto
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 modal-enter">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Oops! Algo salió mal
                </h1>
                <p className="text-slate-600 leading-relaxed">
                  La aplicación encontró un error inesperado. No te preocupes, tus datos están seguros.
                </p>
              </div>
            </div>

            {this.state.error && (
              <details className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <summary className="cursor-pointer font-medium text-slate-700 mb-2">
                  Detalles técnicos
                </summary>
                <div className="text-sm text-slate-600 font-mono whitespace-pre-wrap break-words">
                  <pre className="overflow-auto max-h-64">{serializeError(this.state.error)}</pre>
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 active:scale-95"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 active:scale-95"
              >
                Ir al inicio
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-4">
              Si el problema persiste, por favor contacta al soporte técnico.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
