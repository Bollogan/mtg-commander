@echo off
REM Script de inicio optimizado para Docker Compose del MTG Deck Builder
REM Diseñado para integración con aplicaciones de control (sin pausas bloqueantes)

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend

echo ===================================================
echo   Control Docker Compose - Iniciar Servicios
echo ===================================================
echo.

echo [1/3] Realizando Git Pull...
cd /d "%SCRIPT_DIR%"
git pull --no-rebase --no-edit > "%TEMP%\mtg_git_pull.txt" 2>&1
set PULL_STATUS=%errorlevel%
type "%TEMP%\mtg_git_pull.txt"

if %PULL_STATUS% neq 0 (
    echo.
    echo [ADVERTENCIA] Fallo al sincronizar con git o existen conflictos. Continuando con archivos locales...
    set CHANGES=0
) else (
    findstr /C:"Already up to date" "%TEMP%\mtg_git_pull.txt" >nul
    if !errorlevel! equ 0 (
        echo.
        echo [OK] El repositorio ya esta actualizado.
        set CHANGES=0
    ) else (
        echo.
        echo [INFO] Nuevos cambios detectados en el repositorio.
        set CHANGES=1
    )
)
del "%TEMP%\mtg_git_pull.txt" 2>nul

echo.
echo [2/3] Verificando estado actual de Docker...
cd /d "%BACKEND_DIR%"
docker ps --format "{{.Names}}" | findstr /C:"mtg-gateway" >nul
if %errorlevel% equ 0 (
    echo [OK] Los contenedores ya estan en ejecucion.
    set RUNNING=1
) else (
    echo [INFO] Los contenedores no estan levantados.
    set RUNNING=0
)

echo.
echo [3/3] Ejecutando accion correspondiente...
if "!CHANGES!"=="1" (
    if "!RUNNING!"=="1" (
        echo Nuevos cambios detectados. Recompilando y reiniciando contenedores...
    ) else (
        echo Nuevos cambios detectados. Compilando y levantando contenedores...
    )
    docker-compose up --build -d
) else (
    if "!RUNNING!"=="0" (
        echo Repositorio sin cambios, pero contenedores apagados. Levantando...
        docker-compose up -d
    ) else (
        echo Todo actualizado y en ejecucion.
    )
)

echo.
echo Dockers running. Manteniendo proceso activo...
:loop
ping -n 60 127.0.0.1 >nul
goto loop
