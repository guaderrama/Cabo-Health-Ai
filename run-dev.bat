@echo off
REM Script para ejecutar el servidor de desarrollo
REM Soluciona problemas de PowerShell con npm

echo.
echo ========================================
echo  Cabo Health Nova - Dev Server
echo ========================================
echo.

REM Cambiar a directorio del proyecto
cd /d "%~dp0"

REM Verificar que package.json existe
if not exist "package.json" (
    echo ERROR: package.json no encontrado
    echo Asegúrate de estar en el directorio correcto
    pause
    exit /b 1
)

REM Verificar que node_modules existe, si no, instalar
if not exist "node_modules" (
    echo Instalando dependencias (primera vez)...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install falló
        pause
        exit /b 1
    )
)

echo.
echo Iniciando servidor de desarrollo...
echo.
echo Abrirá en: http://localhost:5173
echo.
echo Presiona Ctrl+C para detener
echo.

REM Ejecutar dev server
call npm run dev

pause
