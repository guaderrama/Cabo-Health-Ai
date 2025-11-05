# Script PowerShell para ejecutar el servidor de desarrollo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Cabo Health Nova - Dev Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del proyecto
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Verificar que package.json existe
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json no encontrado" -ForegroundColor Red
    Write-Host "Asegúrate de estar en el directorio correcto"
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar que node_modules existe, si no, instalar
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias (primera vez)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install falló" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit 1
    }
}

Write-Host ""
Write-Host "Iniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host ""
Write-Host "Abrirá en: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

# Ejecutar dev server
npm run dev

Read-Host "Presiona Enter para salir"
