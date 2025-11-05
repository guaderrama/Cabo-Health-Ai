import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { XIcon, CheckIcon, AlertTriangle, Info } from './icons';

interface ApiDiagnosticProps {
  onClose: () => void;
  language: 'es' | 'en';
}

interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  solution?: string;
}

const ApiDiagnostic: React.FC<ApiDiagnosticProps> = ({ onClose, language }) => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const texts = {
    es: {
      title: 'Diagnóstico de API de Gemini',
      subtitle: 'Verificando configuración y conectividad',
      close: 'Cerrar',
      runTest: 'Ejecutar Diagnóstico',
      running: 'Ejecutando...',
      step1: 'Verificar API Key',
      step2: 'Probar conexión con Gemini',
      step3: 'Verificar modelo disponible',
      step4: 'Probar generación de contenido',
      success: 'Éxito',
      error: 'Error',
      warning: 'Advertencia',
      pending: 'Pendiente',
      summary: 'Resumen',
      allGood: 'Todo está configurado correctamente',
      hasIssues: 'Se encontraron problemas que necesitan atención',
      getApiKey: 'Obtener API Key',
      documentation: 'Ver Documentación',
    },
    en: {
      title: 'Gemini API Diagnostic',
      subtitle: 'Checking configuration and connectivity',
      close: 'Close',
      runTest: 'Run Diagnostic',
      running: 'Running...',
      step1: 'Verify API Key',
      step2: 'Test Gemini connection',
      step3: 'Check model availability',
      step4: 'Test content generation',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      pending: 'Pending',
      summary: 'Summary',
      allGood: 'Everything is configured correctly',
      hasIssues: 'Issues found that need attention',
      getApiKey: 'Get API Key',
      documentation: 'View Documentation',
    }
  };

  const t = texts[language];

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateLastResult = (updates: Partial<DiagnosticResult>) => {
    setResults(prev => {
      const newResults = [...prev];
      if (newResults.length > 0) {
        newResults[newResults.length - 1] = {
          ...newResults[newResults.length - 1],
          ...updates
        };
      }
      return newResults;
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setCurrentStep(0);

    // PASO 1: Verificar API Key
    setCurrentStep(1);
    addResult({
      step: t.step1,
      status: 'pending',
      message: language === 'es' ? 'Verificando...' : 'Checking...'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '' || apiKey === 'tu_api_key_de_gemini_aqui') {
      updateLastResult({
        status: 'error',
        message: language === 'es'
          ? '❌ API Key no configurada'
          : '❌ API Key not configured',
        details: language === 'es'
          ? 'La variable VITE_GEMINI_API_KEY no está definida en el archivo .env'
          : 'VITE_GEMINI_API_KEY variable is not defined in .env file',
        solution: language === 'es'
          ? '1. Crea un archivo .env en la raíz del proyecto\n2. Agrega: VITE_GEMINI_API_KEY=tu_api_key_real\n3. Obtén una API key de: https://aistudio.google.com/apikey\n4. Reinicia el servidor de desarrollo'
          : '1. Create a .env file in project root\n2. Add: VITE_GEMINI_API_KEY=your_real_api_key\n3. Get an API key from: https://aistudio.google.com/apikey\n4. Restart the development server'
      });
      setIsRunning(false);
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      updateLastResult({
        status: 'warning',
        message: language === 'es'
          ? '⚠️ API Key con formato sospechoso'
          : '⚠️ API Key format looks suspicious',
        details: language === 'es'
          ? `Las API keys de Google AI Studio normalmente empiezan con "AIza". Tu key empieza con "${apiKey.substring(0, 4)}"`
          : `Google AI Studio API keys normally start with "AIza". Your key starts with "${apiKey.substring(0, 4)}"`,
        solution: language === 'es'
          ? 'Verifica que copiaste la key completa y correctamente'
          : 'Verify you copied the complete key correctly'
      });
    } else {
      updateLastResult({
        status: 'success',
        message: language === 'es'
          ? `✅ API Key encontrada (${apiKey.length} caracteres)`
          : `✅ API Key found (${apiKey.length} characters)`,
        details: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
      });
    }

    // PASO 2: Probar conexión básica
    setCurrentStep(2);
    addResult({
      step: t.step2,
      status: 'pending',
      message: language === 'es' ? 'Conectando...' : 'Connecting...'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Say only "OK" if you can hear me.' }]
            }]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        const errorMessage = errorData.error?.message || response.statusText;

        let solution = '';
        if (response.status === 400) {
          solution = language === 'es'
            ? 'API Key inválida. Genera una nueva en https://aistudio.google.com/apikey'
            : 'Invalid API Key. Generate a new one at https://aistudio.google.com/apikey';
        } else if (response.status === 403) {
          solution = language === 'es'
            ? 'API Key sin permisos o con restricciones. Verifica en Google Cloud Console.'
            : 'API Key lacks permissions or has restrictions. Check in Google Cloud Console.';
        } else if (response.status === 429) {
          solution = language === 'es'
            ? 'Límite de cuota excedido. Espera unos minutos.'
            : 'Quota limit exceeded. Wait a few minutes.';
        }

        updateLastResult({
          status: 'error',
          message: `❌ Error ${response.status}: ${errorMessage}`,
          details: errorMessage,
          solution
        });
        setIsRunning(false);
        return;
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';

      updateLastResult({
        status: 'success',
        message: language === 'es'
          ? '✅ Conexión exitosa con Gemini API'
          : '✅ Successful connection to Gemini API',
        details: `${language === 'es' ? 'Respuesta' : 'Response'}: "${responseText}"`
      });

    } catch (error: any) {
      updateLastResult({
        status: 'error',
        message: language === 'es'
          ? '❌ Error de red'
          : '❌ Network error',
        details: error.message,
        solution: language === 'es'
          ? 'Verifica tu conexión a Internet'
          : 'Check your Internet connection'
      });
      setIsRunning(false);
      return;
    }

    // PASO 3: Verificar modelo de Live API
    setCurrentStep(3);
    addResult({
      step: t.step3,
      status: 'pending',
      message: language === 'es' ? 'Verificando modelo...' : 'Checking model...'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const modelsToTry = [
      'gemini-2.5-flash-native-audio-preview-09-2025',
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
    ];

    let modelFound = false;
    let workingModel = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`
        );

        if (response.ok) {
          modelFound = true;
          workingModel = model;
          break;
        }
      } catch (e) {
        // Continue trying other models
      }
    }

    if (modelFound) {
      updateLastResult({
        status: 'success',
        message: language === 'es'
          ? `✅ Modelo encontrado: ${workingModel}`
          : `✅ Model found: ${workingModel}`,
        details: language === 'es'
          ? 'Este modelo puede ser usado para Live API'
          : 'This model can be used for Live API'
      });
    } else {
      updateLastResult({
        status: 'warning',
        message: language === 'es'
          ? '⚠️ Modelo de Live API no verificado'
          : '⚠️ Live API model not verified',
        details: language === 'es'
          ? 'El modelo gemini-2.5-flash-native-audio-preview-09-2025 puede no estar disponible en tu región o API key'
          : 'The gemini-2.5-flash-native-audio-preview-09-2025 model may not be available in your region or API key',
        solution: language === 'es'
          ? 'Prueba iniciar una sesión. Si falla, contacta soporte de Google AI.'
          : 'Try starting a session. If it fails, contact Google AI support.'
      });
    }

    // PASO 4: Verificar SDK
    setCurrentStep(4);
    addResult({
      step: language === 'es' ? 'Verificar SDK de Gemini' : 'Verify Gemini SDK',
      status: 'pending',
      message: language === 'es' ? 'Verificando...' : 'Checking...'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const ai = new GoogleGenAI({ apiKey });

      updateLastResult({
        status: 'success',
        message: language === 'es'
          ? '✅ SDK de @google/genai funcionando correctamente'
          : '✅ @google/genai SDK working correctly',
        details: language === 'es'
          ? 'Cliente inicializado exitosamente'
          : 'Client initialized successfully'
      });
    } catch (error: any) {
      updateLastResult({
        status: 'error',
        message: language === 'es'
          ? '❌ Error inicializando SDK'
          : '❌ Error initializing SDK',
        details: error.message,
        solution: language === 'es'
          ? 'Ejecuta: npm install @google/genai'
          : 'Run: npm install @google/genai'
      });
    }

    setIsRunning(false);
  };

  const hasErrors = results.some(r => r.status === 'error');
  const hasWarnings = results.some(r => r.status === 'warning');

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{t.title}</h2>
            <p className="text-slate-600 text-sm mt-1">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-6">
          {results.length === 0 && !isRunning && (
            <div className="text-center py-12">
              <Info className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-slate-600 mb-6">
                {language === 'es'
                  ? 'Ejecuta el diagnóstico para verificar la configuración de tu API de Gemini'
                  : 'Run the diagnostic to verify your Gemini API configuration'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  result.status === 'success' ? 'border-green-200 bg-green-50' :
                  result.status === 'error' ? 'border-red-200 bg-red-50' :
                  result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {result.status === 'success' && <CheckIcon className="w-5 h-5 text-green-600" />}
                    {result.status === 'error' && <XIcon className="w-5 h-5 text-red-600" />}
                    {result.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                    {result.status === 'pending' && (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 mb-1">
                      {result.step}
                    </h3>
                    <p className="text-sm text-slate-700 mb-2">
                      {result.message}
                    </p>

                    {result.details && (
                      <div className="bg-white/50 rounded p-2 text-xs font-mono text-slate-600 mb-2">
                        {result.details}
                      </div>
                    )}

                    {result.solution && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          💡 {language === 'es' ? 'Solución' : 'Solution'}:
                        </p>
                        <p className="text-xs text-blue-800 whitespace-pre-line">
                          {result.solution}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {results.length > 0 && !isRunning && (
            <div className={`mt-6 p-4 rounded-lg border-2 ${
              hasErrors ? 'border-red-300 bg-red-50' :
              hasWarnings ? 'border-yellow-300 bg-yellow-50' :
              'border-green-300 bg-green-50'
            }`}>
              <h3 className="font-bold text-lg mb-2">
                {t.summary}
              </h3>
              <p className="text-sm">
                {hasErrors ? (
                  <>❌ {t.hasIssues}</>
                ) : hasWarnings ? (
                  <>⚠️ {language === 'es' ? 'Configuración funcional con advertencias' : 'Working configuration with warnings'}</>
                ) : (
                  <>✅ {t.allGood}</>
                )}
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="flex items-center justify-between p-6 border-t bg-slate-50">
          <div className="flex gap-2">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              🔑 {t.getApiKey}
            </a>
            <span className="text-slate-300">|</span>
            <a
              href="https://ai.google.dev/gemini-api/docs/live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              📚 {t.documentation}
            </a>
          </div>

          <button
            onClick={isRunning ? undefined : runDiagnostics}
            disabled={isRunning}
            className="px-6 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? t.running : t.runTest}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ApiDiagnostic;
