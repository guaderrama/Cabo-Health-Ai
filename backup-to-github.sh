#!/bin/bash

# Script de Respaldo para Cabo Health Nova en GitHub
# Ejecutar este script después de crear el repositorio en GitHub

echo "🚀 Iniciando respaldo de Cabo Health Nova en GitHub..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse desde el directorio raíz de cabo-health-nova${NC}"
    echo "Ejecuta: cd cabo-health-nova && ./backup-to-github.sh"
    exit 1
fi

# Verificar que Git está disponible
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git no está instalado${NC}"
    exit 1
fi

# Configurar Git si es necesario
echo -e "${BLUE}📋 Configurando Git...${NC}"
git config --global --add safe.directory /workspace 2>/dev/null || true
git config --global --add safe.directory $(pwd) 2>/dev/null || true

# Verificar estado del repositorio
echo -e "${BLUE}🔍 Verificando estado del repositorio...${NC}"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Inicializando repositorio Git...${NC}"
    git init
    git add .
    git commit -m "🚀 Initial commit: Cabo Health Nova - Asistente Médico con IA"
fi

# Crear archivo de información del respaldo
cat > github-backup-info.txt << EOF
# Respaldo de Cabo Health Nova - GitHub

## ✅ Archivos Incluidos en el Respaldo

### Código Principal
- ✅ /src/ - Todo el código frontend React/TypeScript
- ✅ /supabase/ - Edge Functions y configuración de backend
- ✅ /docs/ - Documentación técnica completa
- ✅ package.json y dependencias
- ✅ Configuración de build (vite.config.ts, tsconfig.json, etc.)

### Configuración
- ✅ .env.example - Plantilla de variables de entorno
- ✅ .gitignore - Archivos excluidos de Git
- ✅ README.md - Documentación completa del proyecto

### Documentación Técnica
- ✅ ARCHITECTURE.md - Arquitectura del sistema
- ✅ SECURITY.md - Configuración de seguridad
- ✅ OPERATIONS.md - Operaciones y deploy
- ✅ SISTEMA_PERSISTENCIA.md - Sistema de persistencia
- ✅ REPORTE_VALIDACION_TECNICA.md - Reporte de validación

### Memory/Contexto
- ✅ TODO.md - Tareas pendientes
- ✅ BLOCKERS.md - Bloqueadores resueltos
- ✅ DECISIONS.md - Decisiones técnicas
- ✅ NOTES.md - Notas importantes

## 🚀 Pasos para Completar el Respaldo

1. Crear repositorio en GitHub:
   - Ir a https://github.com/new
   - Nombre del repo: "cabo-health-nova"
   - Descripción: "Cabo Health Nova - Asistente Médico con IA Conversacional"
   - Público o Privado según prefieras

2. Ejecutar estos comandos:
   git remote add origin <URL_DE_TU_REPOSITORIO>
   git branch -M main
   git push -u origin main

## ✅ Estado Actual del Proyecto

- ✅ Frontend: React + TypeScript + Vite
- ✅ Backend: 4 Edge Functions desplegadas en Supabase
- ✅ Base de Datos: PostgreSQL con RLS configurado
- ✅ IA: Gemini 2.5 Flash integrado
- ✅ Audio: WebRTC + Web Audio API
- ✅ UI: TailwindCSS + Radix UI
- ✅ Seguridad: Autenticación + sanitización + RLS
- ✅ Persistencia: Sistema de checkpoints automáticos
- ✅ Email: Sistema de envío (simulado o real)

## 🌐 Enlaces Importantes

- Aplicación en Vivo: https://etric4luf0vq.space.minimax.io
- Supabase Dashboard: https://supabase.com/dashboard/project/cozsoshuctvhvdbmkmwc
- Documentación: Ver carpeta /docs/

## 🔐 Variables de Entorno Configuradas

En Supabase Dashboard están configuradas:
- GEMINI_API_KEY ✅
- SERVICE_ROLE_KEY ✅
- PROJECT_URL ✅

Generado el: $(date)
Respaldo creado por: MiniMax Agent
EOF

echo -e "${GREEN}✅ Información del respaldo creada: github-backup-info.txt${NC}"
echo ""

# Verificar archivos importantes
echo -e "${BLUE}📁 Verificando estructura de archivos...${NC}"
important_files=(
    "package.json"
    "README.md"
    ".env.example"
    ".gitignore"
    "src/App.tsx"
    "supabase/functions"
    "docs"
)

for file in "${important_files[@]}"; do
    if [ -e "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
    fi
done

echo ""

# Mostrar estado de Git
echo -e "${BLUE}📊 Estado actual de Git:${NC}"
git status --porcelain | head -10
echo ""

# Mostrar commits recientes
echo -e "${BLUE}🕒 Historial de commits recientes:${NC}"
git log --oneline -5 2>/dev/null || echo "No hay commits aún"

echo ""

# Instrucciones finales
echo -e "${YELLOW}🎯 PASOS SIGUIENTES:${NC}"
echo "1. Crear repositorio en GitHub: https://github.com/new"
echo "   - Nombre: cabo-health-nova"
echo "   - Descripción: Cabo Health Nova - Asistente Médico con IA"
echo ""
echo "2. Conectar repositorio remoto:"
echo "   git remote add origin <URL_DE_TU_REPO>"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. ¡Listo! Tu proyecto estará respaldado en GitHub"
echo ""
echo -e "${GREEN}✅ Script de respaldo completado${NC}"