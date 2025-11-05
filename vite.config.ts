import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import sourceIdentifierPlugin from 'vite-plugin-source-identifier';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development, production)
  loadEnv(mode, process.cwd(), '');
  
  // Determinar si estamos en producción
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react(),
      sourceIdentifierPlugin({
        enabled: !isProd,
        attributePrefix: 'data-matrix',
        includeProps: true,
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    // Asegurar que las variables de entorno estén disponibles
    define: {
      // Inyectar explícitamente las variables necesarias
      __DEV__: !isProd,
    },
    // Configurar el prefijo para variables públicas
    envPrefix: ['VITE_'],
    // Para producción, especificar el archivo de entorno
    ...(isProd && {
      // En producción, Vite automáticamente carga .env.production si existe
    }),
  };
});
