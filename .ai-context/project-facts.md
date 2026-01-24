# Cabo Health Nova - Hechos del Proyecto

## Información General
- **Nombre**: Cabo Health Nova
- **Descripción**: Asistente Médico con IA Conversacional de Próxima Generación
- **Estado**: En producción y funcionando
- **Autor**: Ivan Guaderrama
- **Desarrollado con**: MiniMax Agent

## URLs Importantes
- **Aplicación Desplegada**: https://etric4luf0vq.space.minimax.io
- **Supabase Dashboard**: https://cozsoshuctvhvdbmkmwc.supabase.co
- **Proyecto Supabase**: cozsoshuctvhvdbmkmwc

## Stack Tecnológico

### Frontend
- **Framework**: React 18.3
- **Lenguaje**: TypeScript 5.6
- **Build Tool**: Vite 6.2
- **Estilos**: TailwindCSS
- **Componentes UI**: Radix UI
- **Estado**: Context API
- **Audio**: WebRTC + Web Audio API

### Backend (Supabase)
- **Servicio**: Supabase (Backend as a Service)
- **Base de Datos**: PostgreSQL
- **Autenticación**: Supabase Auth (JWT)
- **Storage**: Supabase Storage
- **Edge Functions**: 4 funciones en Deno runtime
- **RLS**: Row Level Security habilitado

### IA y APIs
- **IA Conversacional**: Gemini 2.5 Flash Native Audio (Google AI) - para entrevistas en tiempo real
- **IA Resumenes**: Gemini 3 Flash (primario) / Gemini 2.5 Flash (fallback) - para generacion SOAP
- **Transcripcion**: WebRTC nativa
- **Email**: Resend API (opcional)
- **Procesamiento**: Edge Functions para logica compleja

## Estructura del Proyecto
```
cabo-health-nova/
├── src/
│   ├── components/     # 25+ componentes React
│   ├── contexts/       # Context API (Auth)
│   ├── lib/           # Supabase client, utilidades
│   ├── services/      # Servicios (audio, summaryQueue)
│   ├── utils/         # Helpers (audio, sanitize)
│   └── types.ts       # TypeScript definitions
├── supabase/
│   └── functions/     # 4 Edge Functions
├── docs/             # Documentación técnica
└── public/           # Assets estáticos
```

## Comandos de Desarrollo
```bash
# Desarrollo
npm run dev
npm run dev:local

# Build y Deploy
npm run build
npm run build:prod

# Calidad de Código
npm run lint
npm run lint:fix

# Utilidades
npm run preview       # Vista previa del build
npm run clean         # Limpiar dependencias
npm run type-check    # Verificar tipos TypeScript
```

## Base de Datos (Supabase)

### Tablas Principales
1. **patients** - Informacion de pacientes
2. **consultations** - Consultas medicas realizadas
3. **transcriptions** - Transcripciones de conversaciones
4. **summaries** - Resumenes clinicos SOAP
5. **sessions** - Sesiones de consultas
6. **session_checkpoints** - Checkpoints de persistencia
7. **pending_summaries** - Cola de generacion asincrona de resumenes (datos seguros primero)

### Edge Functions
1. **save-consultation** - Guarda consulta completa
2. **generate-summary** - Genera resumen SOAP con Gemini AI
3. **send-summary-email** - Envía resumen por email
4. **get-consultations** - Obtiene historial de consultas

## Variables de Entorno
```env
# Requeridas
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4

# Edge Functions
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyBsoNLTcxY-r33SFT4CXePqdEGjDVkwYN4

# Opcionales
RESEND_API_KEY=re_...
```

## Funcionalidades Principales
- **Conversacion Voz a Voz** - IA conversacional con Gemini Native Audio
- **Transcripcion en Tiempo Real** - Visualizacion de conversacion
- **Resumenes SOAP Automatizados** - Generacion clinica con Gemini 3 Flash
- **Sistema de Persistencia** - Checkpoints automaticos cada 2 mensajes
- **Cola de Resumenes** - Transcripts guardados ANTES de procesar (nunca se pierden)
- **Backend Completo** - Supabase con RLS y autenticacion
- **Envio de Emails** - Resumenes al medico
- **Bilingue** - Espanol e Ingles
- **Recuperacion de Sesion** - Modal de recuperacion automatica
- **Responsive Design** - Mobile-first

## Estado Actual
- ✅ Aplicación desplegada y funcional
- ✅ Base de datos configurada con RLS
- ✅ Edge Functions desplegadas
- ✅ Sistema de autenticación implementado
- ✅ Documentación completa disponible
- ✅ Sistema de persistencia funcionando

## Dependencias Principales
```json
{
  "@google/genai": "^1.28.0",
  "@supabase/supabase-js": "^2.78.0",
  "react": "^18.3.1",
  "react-hook-form": "^7.54.2",
  "dompurify": "^3.3.0",
  "date-fns": "^3.0.0",
  "zod": "^3.24.1",
  "lucide-react": "^0.364.0"
}
```

## Testing y Debugging
- **URL de Testing**: https://etric4luf0vq.space.minimax.io
- **Cuenta de Prueba**: arxaonpy@minimax.com
- **Debug Tools**: DevTools, ErrorBoundary, Console logs
- **Backend Logs**: Supabase Dashboard

## Performance
- **Bundle Size**: 720.34 kB (optimizado)
- **Build Time**: ~4 segundos
- **Loading**: Progresivo con lazy loading

---
*Actualizado: 2026-01-23*
*Version del Proyecto: 1.1.0*