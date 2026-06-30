@echo off
REM Script para iniciar todos los microservicios del MTG Deck Builder
REM Uso: start-all-services.bat

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend

if not exist "%SCRIPT_DIR%logs" mkdir "%SCRIPT_DIR%logs"

cls
echo.
echo ========================================
echo MTG Deck Builder - Microservicios Start
echo ========================================
echo.

echo Selecciona opción:
echo 1) Docker Compose
echo 2) Ejecutables locales
echo.
set /p choice="Opción (1-2): "

if "%choice%"=="1" goto docker_option
if "%choice%"=="2" goto local_option

color 0C
echo [ERROR] Opción inválida
color 0F
pause
exit /b 1

:docker_option
cls
echo.
echo ========================================
echo Iniciando con Docker Compose...
echo ========================================
echo.

cd /d "%BACKEND_DIR%"
if not exist "docker-compose.yml" (
    color 0C
    echo [ERROR] docker-compose.yml no encontrado
    color 0F
    pause
    exit /b 1
)

docker-compose up -d
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Fallo en Docker Compose
    color 0F
    pause
    exit /b 1
)

color 0A
echo [OK] Servicios iniciados en Docker
color 0F
echo.
echo Accesos:
echo - Eureka:       http://localhost:11024
echo - API Gateway:  http://localhost:11032
echo - PostgreSQL:   localhost:11020
echo.
pause
exit /b 0

:local_option
cls
echo.
echo ========================================
echo Iniciando servicios locales...
echo ========================================
echo.

REM Verificar Maven
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Maven no está instalado en el sistema.
    echo Es necesario para compilar y ejecutar los servicios localmente.
    color 0F
    pause
    exit /b 1
)

color 0E
echo [ADVERTENCIA] PostgreSQL debe estar corriendo en localhost:5432
color 0F
echo.
echo Para iniciar PostgreSQL en Windows:
echo   Opción 1: Abre Services.msc y busca "PostgreSQL"
echo   Opción 2: Ejecuta "pg_ctl -D C:\Program Files\PostgreSQL\14\data start"
echo.
pause

echo.
echo Iniciando Eureka Server...
cd /d "%BACKEND_DIR%\eureka-server"
if not exist "pom.xml" (
    color 0C
    echo [ERROR] pom.xml no encontrado
    color 0F
    pause
    exit /b 1
)
start "Eureka Server" /min cmd /c "title Eureka Server && mvn clean spring-boot:run -Dspring-boot.run.arguments=\"--server.port=11024\" > \"%SCRIPT_DIR%logs\eureka-server.log\" 2>&1"
timeout /t 5 /nobreak >nul

echo Esperando Eureka...
set retry=0
:eureka_check
timeout /t 1 /nobreak >nul
set /a retry=!retry!+1
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:11024/actuator/health' -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    color 0A
    echo [OK] Eureka disponible
    color 0F
    goto start_gateway
)
if !retry! lss 30 goto eureka_check

color 0C
echo [ERROR] Eureka no respondió
color 0F
pause
exit /b 1

:start_gateway
echo.
echo Iniciando API Gateway...
cd /d "%BACKEND_DIR%\api-gateway"
start "API Gateway" /min cmd /c "title API Gateway && mvn clean spring-boot:run -Dspring-boot.run.arguments=\"--server.port=11032\" > \"%SCRIPT_DIR%logs\api-gateway.log\" 2>&1"
timeout /t 3 /nobreak >nul
color 0A
echo [OK] API Gateway iniciado
color 0F

echo.
echo Iniciando Auth Service...
cd /d "%BACKEND_DIR%\auth-service"
start "Auth Service" /min cmd /c "title Auth Service && mvn clean spring-boot:run -Dspring-boot.run.arguments=\"--server.port=11028\" > \"%SCRIPT_DIR%logs\auth-service.log\" 2>&1"
timeout /t 3 /nobreak >nul
color 0A
echo [OK] Auth Service iniciado
color 0F

echo.
echo Iniciando Search Service...
cd /d "%BACKEND_DIR%\search-service"
start "Search Service" /min cmd /c "title Search Service && mvn clean spring-boot:run -Dspring-boot.run.arguments=\"--server.port=11030\" > \"%SCRIPT_DIR%logs\search-service.log\" 2>&1"
timeout /t 3 /nobreak >nul
color 0A
echo [OK] Search Service iniciado
color 0F

echo.
echo Iniciando Deck Service...
cd /d "%BACKEND_DIR%\deck-service"
start "Deck Service" /min cmd /c "title Deck Service && mvn clean spring-boot:run -Dspring-boot.run.arguments=\"--server.port=8083\" > \"%SCRIPT_DIR%logs\deck-service.log\" 2>&1"
timeout /t 3 /nobreak >nul
color 0A
echo [OK] Deck Service iniciado
color 0F

cls
echo.
echo ========================================
color 0A
echo [OK] Todos los servicios iniciados
color 0F
echo ========================================
echo.
echo Accesos:
echo - Eureka:       http://localhost:11024
echo - API Gateway:  http://localhost:11032
echo - Auth Service: http://localhost:11028
echo - Search Service: http://localhost:11030
echo - Deck Service: http://localhost:8083
echo.
echo Logs en: %SCRIPT_DIR%logs\
echo.
echo Para detener servicios ejecuta: stop-all-services.bat
echo.
pause
exit /b 0
