@echo off
REM Script de parada optimizado para Docker Compose del MTG Deck Builder
REM Diseñado para integración con aplicaciones de control (sin pausas bloqueantes)

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend

echo ===================================================
echo   Control Docker Compose - Detener Servicios
echo ===================================================
echo.

cd /d "%BACKEND_DIR%"
echo Apagando los contenedores de Docker (manteniendo recursos)...
docker-compose stop --timeout 2

echo.
echo [OK] Ecosistema de Docker detenido correctamente.
