@echo off
REM Script para detener todos los microservicios del MTG Deck Builder
REM Uso: stop-all-services.bat

setlocal enabledelayedexpansion

cls
echo.
echo ========================================
echo Deteniendo Microservicios
echo ========================================
echo.

REM Array de servicios
set services=Eureka Server API Gateway Auth Service Search Service Deck Service

for %%s in (%services%) do (
    set service=%%s
    echo Deteniendo !service!...
    taskkill /FI "WINDOWTITLE eq !service!" /T /F >nul 2>nul
    if !errorlevel! equ 0 (
        color 0A
        echo [OK] !service! detenido
        color 0F
    ) else (
        echo [INFO] !service! no estaba corriendo
    )
)

echo.
echo Deteniendo Docker Compose (si está en uso)...
cd /d "%~dp0backend"
docker-compose down >nul 2>nul

echo.
echo ========================================
color 0A
echo [OK] Todos los servicios detenidos
color 0F
echo ========================================
echo.
pause
exit /b 0
