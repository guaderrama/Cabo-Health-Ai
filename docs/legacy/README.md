# Cabo Health Nova 🏥

> Asistente Médico con IA Conversacional de Próxima Generación

[![Estado](https://img.shields.io/badge/Estado-Producción-success)](https://3xudm07rsk65.space.minimax.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)

## 🌐 Aplicación en Vivo

**URL:** https://3xudm07rsk65.space.minimax.io

## 📖 Descripción

Cabo Health Nova es una aplicación médica de vanguardia que utiliza IA conversacional para realizar entrevistas clínicas detalladas. Integra tecnología de voz nativa con Gemini 2.5 Flash para crear una experiencia natural de consulta médica, generando automáticamente resúmenes clínicos en formato SOAP.

### Características Principales

✅ **Conversación Voz a Voz** - Interacción natural con IA usando WebRTC  
✅ **Transcripción en Tiempo Real** - Visualiza la conversación mientras ocurre  
✅ **Resúmenes SOAP Automatizados** - Generación de resúmenes clínicos profesionales  
✅ **Backend Completo** - Persistencia de datos con Supabase  
✅ **Envío de Emails** - Envía resúmenes directamente al médico  
✅ **Bilingüe** - Soporte completo para Español e Inglés  
✅ **Seguro** - Autenticación, RLS, sanitización HTML  

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18+
- pnpm (recomendado) o npm
- Cuenta de Google AI Studio (para GEMINI_API_KEY)

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd cabo-health-nova

# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env

# Configurar GEMINI_API_KEY en .env
# VITE_GEMINI_API_KEY=tu_api_key_aqui
```

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
pnpm dev

# La aplicación estará disponible en http://localhost:3000
```

### Compilar para Producción

```bash
# Crear build optimizado
pnpm build

# Vista previa del build
pnpm preview
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

```env
# API Key de Gemini (OBLIGATORIO)
VITE_GEMINI_API_KEY=tu_api_key_de_gemini

# Configuración de Supabase (Ya configurado en producción)
VITE_SUPABASE_URL=https://cozsoshuctvhvdbmkmwc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Variables de Entorno Opcionales

```env
# API Key de Resend para envío real de emails
RESEND_API_KEY=tu_api_key_de_resend
```

## 🏗️ Arquitectura

### Frontend
- **Framework:** React 18.3 + TypeScript
- **Build Tool:** Vite 6.2
- **Estilos:** TailwindCSS
- **Estado:** Context API
- **Audio:** WebRTC + Web Audio API

### Backend
- **BaaS:** Supabase
- **Base de Datos:** PostgreSQL
- **Autenticación:** Supabase Auth
- **Storage:** Supabase Storage
- **Edge Functions:** Deno runtime

### IA
- **Modelo:** Gemini 2.5 Flash Native Audio
- **Proveedor:** Google AI
- **Modalidades:** Audio + Texto

## 📂 Estructura del Proyecto

```
cabo-health-nova/
├── src/
│   ├── components/       # Componentes React
│   ├── contexts/        # Context API (Auth)
│   ├── lib/            # Utilidades (Supabase client)
│   ├── utils/          # Helpers (audio, sanitize)
│   ├── services/       # Servicios (audio)
│   └── App.tsx         # Componente principal
├── supabase/
│   └── functions/      # Edge Functions
├── public/             # Assets estáticos
└── dist/              # Build de producción
```

## 🔒 Seguridad

- ✅ RLS (Row Level Security) en todas las tablas
- ✅ Sanitización HTML con DOMPurify
- ✅ Autenticación JWT con Supabase
- ✅ Variables de entorno seguras
- ✅ CORS configurado en Edge Functions

## 📊 Base de Datos

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `patients` | Información de pacientes |
| `consultations` | Consultas médicas |
| `transcriptions` | Transcripciones de conversaciones |
| `summaries` | Resúmenes clínicos SOAP |
| `sessions` | Sesiones de consultas |

### Edge Functions

| Función | URL | Descripción |
|---------|-----|-------------|
| `save-consultation` | /functions/v1/save-consultation | Guarda consulta completa |
| `generate-summary` | /functions/v1/generate-summary | Genera resumen SOAP |
| `send-summary-email` | /functions/v1/send-summary-email | Envía email al médico |

## 🎯 Uso

### 1. Autenticación
- Registrarse con email y contraseña
- Iniciar sesión

### 2. Iniciar Consulta
- Ingresar nombre del paciente
- Seleccionar idioma
- Permitir acceso al micrófono
- Hacer clic en "Iniciar Sesión"

### 3. Conversación
- Hablar naturalmente con Nova
- Responder preguntas del cuestionario
- Ver transcripción en tiempo real

### 4. Finalizar
- Hacer clic en "Finalizar Sesión"
- Revisar resumen SOAP generado
- Completar formulario de paciente
- Enviar al médico

## 🐛 Errores Corregidos

Este proyecto incluye correcciones para:

1. ✅ Variables de entorno inconsistentes
2. ✅ Sanitización HTML insegura
3. ✅ Duplicación de transcripciones
4. ✅ Gestión de memoria de audio
5. ✅ Simulación de envío de datos (ahora real)

Ver [DOCUMENTACION_COMPLETA.md](DOCUMENTACION_COMPLETA.md) para detalles.

## 📝 Licencia

Este proyecto fue desarrollado por Ivan Guaderrama con asistencia de MiniMax Agent.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

## 📧 Contacto

Para soporte o consultas sobre este proyecto, contactar al autor original.

---

**Desarrollado con ❤️ por MiniMax Agent**

**Tecnologías:** React · TypeScript · Supabase · Gemini AI · TailwindCSS
