# Guía de Herramientas - Cabo Health Nova

## Para MiniMax Agent

### Archivos Clave del Proyecto
```
# Archivos principales para entender la aplicación
cabo-health-nova/
├── src/App.tsx                     # Aplicación principal
├── src/types.ts                    # Tipos TypeScript
├── src/constants.ts                # Constantes de la aplicación
├── src/contexts/AuthContext.tsx    # Estado de autenticación
├── src/lib/supabase.ts            # Cliente de Supabase
└── supabase/functions/            # Edge Functions

# Archivos de configuración
├── package.json                   # Dependencias y scripts
├── vite.config.ts                 # Configuración de Vite
├── tsconfig.json                  # Configuración de TypeScript
└── tailwind.config.js             # Configuración de TailwindCSS
```

### Variables de Entorno Importantes
```bash
# Frontend (Vite - prefijadas con VITE_)
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4

# Edge Functions (sin prefijo VITE_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4
```

### URLs Importantes
- **Aplicación Desplegada**: https://etric4luf0vq.space.minimax.io
- **Supabase Dashboard**: https://cozsoshuctvhvdbmkmwc.supabase.co
- **Edge Functions**: https://cozsoshuctvhvdbmkmwc.supabase.co/functions/v1/

## Para Desarrollo Local

### Configuración Inicial
```bash
# 1. Clonar el proyecto
cd cabo-health-nova

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env

# 4. Configurar GEMINI_API_KEY en .env
echo "VITE_GEMINI_API_KEY=tu_api_key_aqui" >> .env

# 5. Iniciar desarrollo
npm run dev
```

### Comandos Útiles
```bash
# Desarrollo
npm run dev                    # Servidor de desarrollo
npm run build                  # Compilar para producción
npm run preview                # Vista previa del build
npm run lint                   # Verificar código
npm run lint:fix               # Corregir problemas automáticamente

# Utilidades
npm run type-check             # Verificar tipos TypeScript
npm run clean                  # Limpiar dependencias
```

## Para Testing y Debugging

### Aplicación en Producción
- **URL**: https://etric4luf0vq.space.minimax.io
- **Cuenta de Prueba**: arxaonpy@minimax.com
- **Browser**: Chrome/Firefox con DevTools
- **Network**: Verificar requests a Supabase

### Herramientas de Debug

#### DevTools del Navegador
```javascript
// 1. Abrir DevTools (F12)
// 2. Console - Ver logs de JavaScript
console.log('Debug message');

// 3. Network - Monitorear requests
// 4. Application - Local Storage, Session Storage
// 5. Performance - Análisis de rendimiento
```

#### Supabase Dashboard
- **Database**: Verificar datos en tablas
- **Auth**: Gestionar usuarios
- **Edge Functions**: Logs y testing
- **Storage**: Archivos subidos
- **Settings**: Variables de entorno

#### Error Boundary
```typescript
// El proyecto incluye ErrorBoundary para errores React
// Errores se muestran en pantalla
// Logs en console para debugging adicional
```

## Para Edge Functions

### Funciones Disponibles
1. **save-consultation** - Guardar consulta completa
2. **generate-summary** - Generar resumen SOAP
3. **send-summary-email** - Enviar email de resumen
4. **get-consultations** - Obtener historial

### Testing Edge Functions
```bash
# URL base para Edge Functions
https://cozsoshuctvhvdbmkmwc.supabase.co/functions/v1/

# Ejemplo de testing (Postman o curl)
curl -X POST "https://cozsoshuctvhvdbmkmwc.supabase.co/functions/v1/generate-summary" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "texto de prueba"}'
```

### Logs de Edge Functions
```typescript
// En las Edge Functions, usar console.log para debug
console.log('Debug info:', { key: value });

// Ver logs en Supabase Dashboard > Edge Functions > Logs
```

## Para Base de Datos

### Estructura de Tablas
```
# Tablas principales
patients          # Información de pacientes
consultations     # Consultas realizadas
transcriptions    # Transcripciones
summaries         # Resúmenes clínicos
sessions          # Sesiones de consultas
session_checkpoints # Checkpoints de persistencia
```

### RLS (Row Level Security)
- **Estado**: Habilitado en todas las tablas
- **Política**: Usuarios solo ven sus propios datos
- **Edge Functions**: Acceso como `anon` y `service_role`

### Queries Comunes
```sql
-- Ver consultas del usuario actual
SELECT * FROM consultations WHERE user_id = auth.uid();

-- Ver transcripciones de una consulta
SELECT * FROM transcriptions WHERE consultation_id = $1;

-- Insertar nueva consulta
INSERT INTO consultations (user_id, patient_name, language) 
VALUES (auth.uid(), 'Nombre Paciente', 'es');
```

## Para Audio y Gemini AI

### Configuración de Audio
```typescript
// El proyecto usa WebRTC para audio nativo
// No requiere librerías adicionales
// Funciona en navegadores modernos con permisos de micrófono
```

### Gemini AI Integration
```typescript
// Configurado en Edge Functions
// Usar modelo: gemini-2.0-flash-exp
// Contexto médico configurado
// Soporte para audio y texto
```

## Para Deployment

### Build Process
```bash
# 1. Compilar
npm run build

# 2. La carpeta dist/ se genera automáticamente
# 3. El deployment es automático en la plataforma
```

### Variables de Entorno en Producción
```bash
# Configuradas en la plataforma de deployment
# No requiere configuración manual
# Todas las APIs están configuradas
```

## Para Troubleshooting

### Errores Comunes

#### "VITE_GEMINI_API_KEY not found"
```bash
# Solución: Verificar .env
echo $VITE_GEMINI_API_KEY

# Verificar en DevTools > Application > Local Storage
```

#### Edge Functions return 500
```bash
# Solución: Verificar variables de entorno en Supabase
# Dashboard > Edge Functions > Settings > Environment Variables
# Verificar SUPABASE_SERVICE_ROLE_KEY configurado
```

#### Audio not working
```bash
# Solución: Verificar permisos de micrófono
# Browser > Settings > Privacy > Site Settings > Microphone
# Usar HTTPS (requerido para WebRTC)
```

#### Database connection errors
```bash
# Solución: Verificar RLS policies
# Dashboard > Authentication > Settings > RLS
# Verificar que policies permiten acceso
```

### Logs de Error
```typescript
// Console logs para debugging
console.log('Debug info:', data);

// Error boundaries para React errors
// Supabase logs para database errors
// Network tab para API errors
```

## Para Desarrollo Futuro

### Añadir Nueva Funcionalidad
```typescript
// 1. Crear componente en src/components/
// 2. Definir tipos en src/types.ts
// 3. Añadir estado en Context si es global
// 4. Actualizar rutas si es necesario
// 5. Escribir tests si es crítico
```

### Añadir Nueva Edge Function
```typescript
// 1. Crear carpeta en supabase/functions/
// 2. Implementar función con CORS headers
// 3. Desplegar usando Supabase CLI o dashboard
// 4. Actualizar documentación
```

### Configuración de APIs
```typescript
// 1. Añadir API key a variables de entorno
// 2. Crear servicio en src/services/
// 3. Implementar función con manejo de errores
// 4. Actualizar types si es necesario
```

---

## Recursos Adicionales

### Documentación
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Supabase**: https://supabase.com/docs
- **TailwindCSS**: https://tailwindcss.com/docs
- **Vite**: https://vitejs.dev/guide/

### APIs Externas
- **Gemini AI**: https://ai.google.dev/
- **Resend**: https://resend.com/docs
- **Google AI Studio**: https://makersuite.google.com/

---

*Esta guía debe actualizarse cuando se añadan nuevas herramientas o se cambien configuraciones.*