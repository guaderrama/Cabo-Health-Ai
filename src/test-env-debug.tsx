// Archivo de diagnóstico temporal - Eliminar después de resolver el problema
// Este componente verifica las variables de entorno en tiempo real

import React, { useEffect, useState } from 'react';

export const EnvDebugger: React.FC = () => {
  const [envVars, setEnvVars] = useState<Record<string, any>>({});

  useEffect(() => {
    const vars = {
      'VITE_GEMINI_API_KEY': import.meta.env.VITE_GEMINI_API_KEY,
      'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL,
      'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'MODE': import.meta.env.MODE,
      'DEV': import.meta.env.DEV,
      'PROD': import.meta.env.PROD,
      'BASE_URL': import.meta.env.BASE_URL,
    };

    setEnvVars(vars);

    // Log a consola para debug
    console.log('=== ENV DEBUG ===');
    console.log('VITE_GEMINI_API_KEY:', vars.VITE_GEMINI_API_KEY);
    console.log('VITE_SUPABASE_URL:', vars.VITE_SUPABASE_URL);
    console.log('MODE:', vars.MODE);
    console.log('DEV:', vars.DEV);
    console.log('PROD:', vars.PROD);
    console.log('================');
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#1e293b',
      color: '#e2e8f0',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '400px',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#60a5fa' }}>🔍 ENV Debug</h3>
      {Object.entries(envVars).map(([key, value]) => {
        const displayValue = value === undefined
          ? '❌ UNDEFINED'
          : (key.includes('KEY') || key.includes('ANON'))
            ? `${String(value).substring(0, 20)}...`
            : String(value);

        const color = value === undefined ? '#ef4444' : '#10b981';

        return (
          <div key={key} style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#94a3b8' }}>{key}:</strong>{' '}
            <span style={{ color }}>{displayValue}</span>
          </div>
        );
      })}
      <button
        onClick={() => {
          const el = document.querySelector('[data-env-debug]');
          if (el) el.remove();
        }}
        style={{
          marginTop: '10px',
          padding: '5px 10px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px'
        }}
      >
        Cerrar
      </button>
    </div>
  );
};
