import React, { useState, useEffect } from 'react';
import { MicrophoneIcon, CheckIcon, XIcon } from './icons';

interface DiagnosticStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'checking' | 'success' | 'error';
  details?: string;
  action?: string;
  actionUrl?: string;
}

interface MicrophoneDiagnosticProps {
  language: 'es' | 'en';
  onClose?: () => void;
}

const MicrophoneDiagnostic: React.FC<MicrophoneDiagnosticProps> = ({ language, onClose }) => {
  const [steps, setSteps] = useState<DiagnosticStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const texts = {
    es: {
      title: 'Diagnóstico del Micrófono',
      subtitle: 'Vamos a resolver el problema paso a paso',
      startDiagnostic: 'Iniciar Diagnóstico',
      running: 'Ejecutando diagnóstico...',
      close: 'Cerrar',
      // Diagnostic steps
      secureConnection: 'Conexión Segura (HTTPS)',
      secureConnectionDesc: 'Verificando que la aplicación se ejecute en una conexión segura',
      micSupport: 'Soporte de Navegador',
      micSupportDesc: 'Verificando si el navegador soporta acceso al micrófono',
      permissions: 'Permisos del Sistema',
      permissionsDesc: 'Verificando permisos de micrófono del sistema operativo',
      browserPermissions: 'Permisos del Navegador',
      browserPermissionsDesc: 'Verificando permisos específicos del navegador',
      hardware: 'Hardware del Micrófono',
      hardwareDesc: 'Detectando dispositivos de entrada de audio disponibles',
      finalResult: 'Resultado Final',
      // Status messages
      checking: 'Verificando...',
      success: '✓ Funciona correctamente',
      error: '✗ Problema detectado',
      // Action buttons
      grantPermissions: 'Conceder Permisos',
      openSettings: 'Abrir Configuración',
      reloadPage: 'Recargar Página',
      tryAgain: 'Intentar Nuevamente',
      // Action URLs for different browsers
      chromePermissions: 'chrome://settings/content/microphone',
      firefoxPermissions: 'about:preferences#privacy',
      safariPermissions: 'prefs://',
      // Action descriptions
      actionHttps: 'Asegúrese de que esté visitando el sitio a través de HTTPS (candado verde en la barra de direcciones)',
      actionBrowser: 'Su navegador es compatible con acceso al micrófono',
      actionSystem: 'Habilite permisos de micrófono en la configuración de su sistema operativo',
      actionBrowser2: 'Click en el ícono de micrófono en la barra de direcciones y seleccione "Permitir"',
      actionHardware: 'Conecte un micrófono o verifique que el integrado esté funcionando correctamente'
    },
    en: {
      title: 'Microphone Diagnostic',
      subtitle: 'Let\'s fix the problem step by step',
      startDiagnostic: 'Start Diagnostic',
      running: 'Running diagnostic...',
      close: 'Close',
      // Diagnostic steps
      secureConnection: 'Secure Connection (HTTPS)',
      secureConnectionDesc: 'Verifying that the application runs on a secure connection',
      micSupport: 'Browser Support',
      micSupportDesc: 'Verifying if the browser supports microphone access',
      permissions: 'System Permissions',
      permissionsDesc: 'Verifying microphone permissions from the operating system',
      browserPermissions: 'Browser Permissions',
      browserPermissionsDesc: 'Verifying specific browser permissions',
      hardware: 'Microphone Hardware',
      hardwareDesc: 'Detecting available audio input devices',
      finalResult: 'Final Result',
      // Status messages
      checking: 'Checking...',
      success: '✓ Working correctly',
      error: '✗ Problem detected',
      // Action buttons
      grantPermissions: 'Grant Permissions',
      openSettings: 'Open Settings',
      reloadPage: 'Reload Page',
      tryAgain: 'Try Again',
      // Action URLs for different browsers
      chromePermissions: 'chrome://settings/content/microphone',
      firefoxPermissions: 'about:preferences#privacy',
      safariPermissions: 'prefs://',
      // Action descriptions
      actionHttps: 'Make sure you are visiting the site through HTTPS (green lock in the address bar)',
      actionBrowser: 'Your browser is compatible with microphone access',
      actionSystem: 'Enable microphone permissions in your operating system settings',
      actionBrowser2: 'Click on the microphone icon in the address bar and select "Allow"',
      actionHardware: 'Connect a microphone or verify that the built-in one is working correctly'
    }
  };

  const t = texts[language];

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'unknown';
  };

  const initializeSteps = () => {
    const browser = getBrowserName();
    
    return [
      {
        id: 'secure',
        title: t.secureConnection,
        description: t.secureConnectionDesc,
        status: 'pending' as const,
        details: window.location.protocol === 'https:' ? t.actionHttps : t.actionHttps
      },
      {
        id: 'support',
        title: t.micSupport,
        description: t.micSupportDesc,
        status: 'pending' as const,
        details: t.actionBrowser
      },
      {
        id: 'system',
        title: t.permissions,
        description: t.permissionsDesc,
        status: 'pending' as const,
        details: t.actionSystem,
        action: t.openSettings
      },
      {
        id: 'browser',
        title: t.browserPermissions,
        description: t.browserPermissionsDesc,
        status: 'pending' as const,
        details: t.actionBrowser2,
        action: browser === 'chrome' ? t.grantPermissions : browser === 'firefox' ? t.grantPermissions : t.grantPermissions,
        actionUrl: browser === 'chrome' ? t.chromePermissions : browser === 'firefox' ? t.firefoxPermissions : browser === 'safari' ? t.safariPermissions : undefined
      },
      {
        id: 'hardware',
        title: t.hardware,
        description: t.hardwareDesc,
        status: 'pending' as const,
        details: t.actionHardware
      }
    ];
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    const currentSteps = initializeSteps();
    setSteps(currentSteps);

    // Step 1: Secure Connection
    setSteps(prev => prev.map(step => 
      step.id === 'secure' ? { ...step, status: 'checking' } : step
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSteps(prev => prev.map(step => 
      step.id === 'secure' ? { 
        ...step, 
        status: window.location.protocol === 'https:' ? 'success' : 'error',
        details: window.location.protocol === 'https:' ? t.actionHttps : '❌ No se detectó HTTPS. La aplicación debe ejecutarse en HTTPS para acceder al micrófono.'
      } : step
    ));

    // Step 2: Browser Support
    setSteps(prev => prev.map(step => 
      step.id === 'support' ? { ...step, status: 'checking' } : step
    ));
    
    await new Promise(resolve => setTimeout(resolve, 800));
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setSteps(prev => prev.map(step => 
      step.id === 'support' ? { 
        ...step, 
        status: hasGetUserMedia ? 'success' : 'error',
        details: hasGetUserMedia ? t.actionBrowser : '❌ Su navegador no soporta acceso al micrófono. Use Chrome, Firefox, Safari o Edge actualizado.'
      } : step
    ));

    // Step 3: System Permissions + AudioContext
    setSteps(prev => prev.map(step => 
      step.id === 'system' ? { ...step, status: 'checking' } : step
    ));
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // REPLICAR la secuencia EXACTA de la aplicación principal
    try {
      // 1. Crear AudioContext output (24000 Hz)
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const outputAudioContext = new AudioContext({ sampleRate: 24000 });
      if (outputAudioContext.state === 'suspended') {
        await outputAudioContext.resume();
      }
      
      // 2. Ejecutar función equivalente a playWelcomeSound
      try {
        const masterGain = outputAudioContext.createGain();
        masterGain.connect(outputAudioContext.destination);
        masterGain.gain.setValueAtTime(0.3, outputAudioContext.currentTime);
        
        // Test básico: crear un tono simple para verificar que el output funciona
        const testOscillator = outputAudioContext.createOscillator();
        testOscillator.type = 'sine';
        testOscillator.frequency.setValueAtTime(440, outputAudioContext.currentTime);
        const testGain = outputAudioContext.createGain();
        testGain.gain.setValueAtTime(0, outputAudioContext.currentTime);
        testGain.gain.linearRampToValueAtTime(0.1, outputAudioContext.currentTime + 0.1);
        testGain.gain.exponentialRampToValueAtTime(0.001, outputAudioContext.currentTime + 0.5);
        testOscillator.connect(testGain).connect(masterGain);
        testOscillator.start(outputAudioContext.currentTime);
        testOscillator.stop(outputAudioContext.currentTime + 0.5);
        
        // Esperar a que termine
        await new Promise(resolve => testOscillator.onended = resolve);
      } catch (welcomeError) {
        throw new Error(`Error reproduciendo sonido de bienvenida: ${welcomeError.name || welcomeError.message}`);
      }
      
      // 3. Crear AudioContext input (16000 Hz)
      const audioContextRef = new AudioContext({ sampleRate: 16000 });
      if (audioContextRef.state === 'suspended') {
        await audioContextRef.resume();
      }
      
      // 4. Acceder al micrófono con las opciones EXACTAS de la app
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // 5. Verificar que se puede crear MediaStreamSource
      const source = audioContextRef.createMediaStreamSource(stream);
      
      // Limpiar recursos
      source.disconnect();
      await audioContextRef.close();
      await outputAudioContext.close();
      stream.getTracks().forEach(track => track.stop());
      
      setSteps(prev => prev.map(step => 
        step.id === 'system' ? { 
          ...step, 
          status: 'success',
          details: '✅ Secuencia completa de audio exitosa: Output (24000Hz) + Input (16000Hz) + Micrófono'
        } : step
      ));
    } catch (error) {
      let errorDetails = '';
      
      if (error.message.includes('sonido de bienvenida')) {
        errorDetails = `❌ Error en configuración de audio de salida (24000 Hz): ${error.message}`;
      } else if (error.name === 'NotAllowedError') {
        errorDetails = '❌ Permisos de micrófono denegados por el sistema operativo';
      } else if (error.name === 'NotFoundError') {
        errorDetails = '❌ No se encontró micrófono en el sistema';
      } else if (error.name === 'NotSupportedError') {
        errorDetails = '❌ La configuración de audio no es compatible con este sistema';
      } else {
        errorDetails = `❌ Error en secuencia de audio: ${error.name || error.message}`;
      }
      
      setSteps(prev => prev.map(step => 
        step.id === 'system' ? { 
          ...step, 
          status: 'error',
          details: errorDetails
        } : step
      ));
    }

    // Step 4: Browser Permissions - Verificación real
    setSteps(prev => prev.map(step => 
      step.id === 'browser' ? { ...step, status: 'checking' } : step
    ));
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Verificar permisos del navegador de manera más precisa
    try {
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      let statusMessage = '';
      let status: 'success' | 'error' = 'error';
      
      if (permissions.state === 'granted') {
        status = 'success';
        statusMessage = '✅ Permisos del navegador otorgados';
      } else if (permissions.state === 'prompt') {
        status = 'error';
        statusMessage = '⚠️ Permisos del navegador pendientes - requiere interacción del usuario';
      } else if (permissions.state === 'denied') {
        status = 'error';
        statusMessage = '❌ Permisos del navegador denegados';
      }
      
      setSteps(prev => prev.map(step => 
        step.id === 'browser' ? { 
          ...step, 
          status,
          details: statusMessage + '. ' + t.actionBrowser2
        } : step
      ));
    } catch (error) {
      // Fallback si Permissions API no está disponible
      setSteps(prev => prev.map(step => 
        step.id === 'browser' ? { 
          ...step, 
          status: 'success', // Asumir éxito si no se puede verificar
          details: '⚠️ No se pudo verificar permisos del navegador. ' + t.actionBrowser2
        } : step
      ));
    }

    // Step 5: Hardware Detection
    setSteps(prev => prev.map(step => 
      step.id === 'hardware' ? { ...step, status: 'checking' } : step
    ));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      if (audioInputs.length === 0) {
        setSteps(prev => prev.map(step => 
          step.id === 'hardware' ? { 
            ...step, 
            status: 'error',
            details: '❌ No se detectaron dispositivos de micrófono disponibles. Conecte un micrófono o verifique que el integrado esté funcionando.'
          } : step
        ));
      } else {
        // Probar si al menos uno de los dispositivos está realmente disponible
        let workingDeviceFound = false;
        let deviceDetails = '';
        
        for (let i = 0; i < Math.min(audioInputs.length, 3); i++) { // Probar máximo 3 dispositivos
          try {
            const testStream = await navigator.mediaDevices.getUserMedia({ 
              audio: { deviceId: audioInputs[i].deviceId ? { exact: audioInputs[i].deviceId } : undefined }
            });
            testStream.getTracks().forEach(track => track.stop());
            workingDeviceFound = true;
            
            // Crear detalles informativos
            const deviceLabel = audioInputs[i].label || `Dispositivo de audio ${i + 1}`;
            deviceDetails = deviceLabel;
            break;
          } catch (deviceError) {
            // Este dispositivo específico no funciona, continuar con el siguiente
            continue;
          }
        }
        
        if (workingDeviceFound) {
          setSteps(prev => prev.map(step => 
            step.id === 'hardware' ? { 
              ...step, 
              status: 'success',
              details: `✅ Dispositivo de audio funcional detectado: "${deviceDetails}". Total: ${audioInputs.length} dispositivo(s) disponible(s).`
            } : step
          ));
        } else {
          setSteps(prev => prev.map(step => 
            step.id === 'hardware' ? { 
              ...step, 
              status: 'error',
              details: `❌ Se detectaron ${audioInputs.length} dispositivo(s) de audio, pero ninguno está funcionando correctamente. Verifique las conexiones y permisos.`
            } : step
          ));
        }
      }
    } catch (error) {
      setSteps(prev => prev.map(step => 
        step.id === 'hardware' ? { 
          ...step, 
          status: 'error',
          details: '❌ No se pudo detectar dispositivos de audio. Verifique que la página tenga permisos de micrófono.'
        } : step
      ));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>;
      case 'checking':
        return (
          <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
        );
      case 'success':
        return <CheckIcon className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XIcon className="w-6 h-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'checking':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  useEffect(() => {
    // Initialize steps on component mount
    setSteps(initializeSteps());
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MicrophoneIcon className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">{t.title}</h2>
                <p className="text-blue-100">{t.subtitle}</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {!isRunning && steps.length > 0 && steps.every(step => step.status === 'pending') && (
            <div className="text-center mb-6">
              <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <p className="text-gray-600 mb-4">
                {language === 'es' 
                  ? 'El diagnóstico le ayudará a identificar y resolver problemas con el micrófono.'
                  : 'The diagnostic will help you identify and resolve microphone issues.'
                }
              </p>
              <button
                onClick={runDiagnostic}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
                </svg>
                <span>{t.startDiagnostic}</span>
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center mb-6">
              <svg className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <p className="text-gray-600">{t.running}</p>
            </div>
          )}

          {/* Diagnostic Steps */}
          {steps.length > 0 && (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`border rounded-lg p-4 transition-all ${getStatusColor(step.status)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(step.status)}
                    <div className="flex-1">
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm opacity-80 mt-1">{step.description}</p>
                      {step.details && (
                        <p className="text-sm mt-2">{step.details}</p>
                      )}
                      {step.status === 'checking' && (
                        <p className="text-sm mt-2 font-medium">{t.checking}</p>
                      )}
                      {step.actionUrl && step.status === 'error' && (
                        <button
                          onClick={() => window.open(step.actionUrl!, '_blank')}
                          className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          {step.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Final Result */}
          {!isRunning && steps.length > 0 && steps.every(step => step.status !== 'pending' && step.status !== 'checking') && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">{t.finalResult}</h3>
              <div className="text-sm">
                {steps.every(step => step.status === 'success') ? (
                  <div className="text-green-600">
                    <p>✅ {language === 'es' ? 'Todos los sistemas funcionan correctamente.' : 'All systems are working correctly.'}</p>
                    <p className="mt-1 text-gray-600">
                      {language === 'es' 
                        ? 'Si aún tiene problemas, intente recargar la página o cambiar de navegador.'
                        : 'If you still have problems, try reloading the page or changing browsers.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <p>❌ {language === 'es' ? 'Se detectaron problemas con el micrófono.' : 'Microphone problems were detected.'}</p>
                    <p className="mt-1 text-gray-600">
                      {language === 'es' 
                        ? 'Siga las recomendaciones anteriores para resolver los problemas.'
                        : 'Follow the recommendations above to resolve the issues.'
                      }
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <span>{t.reloadPage}</span>
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {t.close}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MicrophoneDiagnostic;