#!/bin/bash

# 🚀 Script de Push Final - Cabo Health Nova
# Ejecutar desde el directorio /workspace/cabo-health-nova

echo "🚀 Iniciando push final del respaldo de Cabo Health Nova..."
echo "📍 Directorio actual: $(pwd)"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio /workspace/cabo-health-nova"
    echo "💡 Ejecuta: cd /workspace/cabo-health-nova && bash final-push-to-github.sh"
    exit 1
fi

# Verificar estado del repositorio
echo "📊 Verificando estado del repositorio..."
git status

# Verificar commits disponibles
echo "📝 Commits disponibles:"
git log --oneline -3

# Configurar remote si no existe
echo "🔗 Configurando remote..."
if git remote get-url origin &>/dev/null; then
    echo "✅ Remote ya configurado"
    git remote get-url origin
else
    echo "➕ Agregando remote..."
    git remote add origin https://github.com/guaderrama/cabo-health-nova2.git
fi

# Configurar rama
echo "🌿 Configurando rama principal..."
git branch -M main

# Intentar push con diferentes estrategias
echo "🚀 Intentando push al repositorio GitHub..."

# Estrategia 1: Push normal
echo "📤 Intento 1: Push normal"
if git push -u origin main --force 2>/dev/null; then
    echo "✅ ¡Push exitoso! Respaldo completado."
    echo "🔗 Repositorio: https://github.com/guaderrama/cabo-health-nova2"
    exit 0
fi

# Estrategia 2: Push con timeout
echo "📤 Intento 2: Push con timeout (60s)"
if timeout 60s git push -u origin main --force 2>/dev/null; then
    echo "✅ ¡Push exitoso! Respaldo completado."
    echo "🔗 Repositorio: https://github.com/guaderrama/cabo-health-nova2"
    exit 0
fi

# Estrategia 3: Verificar si es problema de autenticación
echo "🔐 Verificando autenticación..."
if git push -u origin main --force; then
    echo "✅ ¡Push exitoso! Respaldo completado."
else
    echo ""
    echo "❌ Push falló. Posibles soluciones:"
    echo ""
    echo "🔧 Solución 1: Configurar token de GitHub"
    echo "   git remote remove origin"
    echo "   git remote add origin https://TU_TOKEN@github.com/guaderrama/cabo-health-nova2.git"
    echo "   git push -u origin main --force"
    echo ""
    echo "🔧 Solución 2: Inicializar repositorio en GitHub"
    echo "   1. Ve a https://github.com/guaderrama/cabo-health-nova2"
    echo "   2. Crea un archivo README.md o cualquier archivo inicial"
    echo "   3. Ejecuta este script nuevamente"
    echo ""
    echo "🔧 Solución 3: Comandos manuales"
    echo "   git remote remove origin"
    echo "   git remote add origin https://github.com/guaderrama/cabo-health-nova2.git"
    echo "   git branch -M main"
    echo "   git push -u origin main --force"
    echo ""
    echo "📋 Estado actual del respaldo:"
    echo "   ✅ Repositorio local: $(git rev-parse HEAD)"
    echo "   ✅ Archivos respaldados: $(git ls-files | wc -l)"
    echo "   ⏳ GitHub: Requiere push manual"
    echo ""
    exit 1
fi