@echo off
REM ============================================================================
REM  MTG Deck Builder - Despliegue COMPLETO en Docker con un solo clic.
REM
REM  Que hace este script (no hay que tocar nada):
REM    1. Comprueba que Docker esta instalado y arrancado.
REM    2. Construye TODAS las imagenes de los microservicios.
REM    3. Levanta toda la plataforma (infra + 10 servicios) en segundo plano.
REM    4. Espera a que el API Gateway responda y muestra las URLs utiles.
REM
REM  Solo se exponen al exterior 2 puertos: API Gateway (11032) y Eureka (11024).
REM  El resto de servicios se hablan entre ellos por la red interna de Docker.
REM
REM  USO: doble clic en este archivo. Nada mas.
REM ============================================================================

setlocal enabledelayedexpansion
title MTG Deck Builder - Deploy Docker

REM --- Situarse en la carpeta del docker-compose (backend) ---
cd /d "%~dp0backend"
if not exist "docker-compose.yml" (
    color 0C
    echo [ERROR] No encuentro docker-compose.yml en "%~dp0backend".
    echo         Coloca este script en la raiz del proyecto mtg-deck-builder.
    color 0F
    echo.
    pause
    exit /b 1
)

cls
echo ========================================================
echo   MTG Deck Builder - Despliegue en Docker
echo ========================================================
echo.

REM --- 1) Comprobar que Docker existe ---
where docker >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Docker no esta instalado o no esta en el PATH.
    echo         Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop
    color 0F
    echo.
    pause
    exit /b 1
)

REM --- 2) Comprobar que el daemon de Docker esta arrancado ---
echo Comprobando que Docker esta arrancado...
docker info >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Docker esta instalado pero NO esta arrancado.
    echo         Abre "Docker Desktop", espera a que ponga "Running" y vuelve a ejecutar este script.
    color 0F
    echo.
    pause
    exit /b 1
)
color 0A
echo [OK] Docker arrancado.
color 0F
echo.

REM --- 3) Elegir el comando de compose disponible (v2 'docker compose' o v1 'docker-compose') ---
set "COMPOSE=docker compose"
docker compose version >nul 2>nul
if %errorlevel% neq 0 (
    set "COMPOSE=docker-compose"
    docker-compose version >nul 2>nul
    if !errorlevel! neq 0 (
        color 0C
        echo [ERROR] No encuentro 'docker compose' ni 'docker-compose'.
        echo         Actualiza Docker Desktop.
        color 0F
        echo.
        pause
        exit /b 1
    )
)

REM --- 4) Construir y levantar TODA la plataforma ---
REM     Se activan los 3 perfiles para que arranquen los 10 servicios de backend.
REM     El frontend NO se incluye (esta en el perfil 'frontend', aparte) porque va
REM     desplegado en Firebase (planeswalkerstower.web.app).
echo Construyendo imagenes y levantando la plataforma (esto puede tardar varios
echo minutos la primera vez: descarga dependencias de Maven y crea las imagenes)...
echo.

%COMPOSE% --profile fase2 --profile fase3 --profile fase4 up -d --build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Fallo al construir o levantar los contenedores.
    echo         Revisa los mensajes de arriba. Para ver el detalle:
    echo             %COMPOSE% logs
    color 0F
    echo.
    pause
    exit /b 1
)

echo.
color 0A
echo [OK] Contenedores creados. Esperando a que el API Gateway responda...
color 0F
echo.

REM --- 5) Esperar a que el Gateway este sano (hasta ~120s) ---
set /a retry=0
:wait_gateway
timeout /t 4 /nobreak >nul
set /a retry=!retry!+1
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://localhost:11032/actuator/health' -UseBasicParsing -TimeoutSec 3).StatusCode | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto gateway_ok
if !retry! lss 30 (
    echo    ...todavia arrancando ^(intento !retry!/30^)
    goto wait_gateway
)

color 0E
echo [AVISO] El Gateway no respondio en el tiempo esperado, pero los contenedores
echo         estan levantados. Puede que sigan arrancando. Comprueba el estado con:
echo             %COMPOSE% ps
echo             %COMPOSE% logs -f api-gateway
color 0F
goto fin

:gateway_ok
color 0A
echo [OK] API Gateway operativo.
color 0F

:fin
echo.
echo ========================================================
echo   Plataforma desplegada
echo ========================================================
echo.
echo   API Gateway (entrada publica) : http://localhost:11032
echo   Eureka Dashboard              : http://localhost:11024
echo.
echo   El resto de servicios NO se exponen al host: se comunican
echo   entre ellos por la red interna de Docker via Eureka.
echo.
echo   Comandos utiles:
echo     Ver estado:      %COMPOSE% ps
echo     Ver logs:        %COMPOSE% logs -f
echo     Apagar todo:     stop-docker.bat   ^(o:  %COMPOSE% --profile fase2 --profile fase3 --profile fase4 down^)
echo.
pause
exit /b 0
