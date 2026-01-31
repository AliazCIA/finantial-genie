# Script para iniciar el servidor en Windows
Write-Host "🚀 Iniciando servidor Financial Genie..." -ForegroundColor Green
Write-Host ""

cd $PSScriptRoot
node index.js
