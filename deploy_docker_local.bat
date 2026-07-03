@echo off
REM ============================================================================
REM  deploy_docker_local.bat
REM  Build + run the FULL MTG platform (all phases + frontend) on Docker locally.
REM
REM  Usage:
REM    deploy_docker_local.bat            Build (if needed) and start the stack
REM    deploy_docker_local.bat build      Force rebuild all images, then start
REM    deploy_docker_local.bat down       Stop and remove containers (keeps data)
REM    deploy_docker_local.bat clean      Stop and remove containers + DB volumes
REM    deploy_docker_local.bat logs       Tail logs for all services
REM    deploy_docker_local.bat status     Show container status
REM ============================================================================
setlocal

REM Compose lives in backend\; run everything from there regardless of CWD.
cd /d "%~dp0backend" || (echo [ERROR] backend directory not found & exit /b 1)

REM All profiles needed for the complete application.
set "PROFILES=--profile fase2 --profile fase3 --profile fase4 --profile frontend"

REM Make sure Docker is reachable before doing anything.
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker does not appear to be running. Start Docker Desktop and retry.
  exit /b 1
)

set "CMD=%~1"

if /i "%CMD%"=="down" (
  echo [*] Stopping stack ^(containers removed, data volumes kept^)...
  docker compose %PROFILES% down
  goto :eof
)

if /i "%CMD%"=="clean" (
  echo [*] Stopping stack and REMOVING data volumes ^(postgres/mongo/redis wiped^)...
  docker compose %PROFILES% down -v
  goto :eof
)

if /i "%CMD%"=="logs" (
  docker compose %PROFILES% logs -f
  goto :eof
)

if /i "%CMD%"=="status" (
  docker compose %PROFILES% ps
  goto :eof
)

if /i "%CMD%"=="build" (
  echo [*] Rebuilding all images ^(this can take several minutes^)...
  docker compose %PROFILES% build
  if errorlevel 1 (echo [ERROR] Build failed. & exit /b 1)
)

echo [*] Starting the full MTG stack...
docker compose %PROFILES% up -d
if errorlevel 1 (echo [ERROR] docker compose up failed. & exit /b 1)

echo.
echo [*] Containers:
docker compose %PROFILES% ps

echo.
echo ============================================================================
echo  Stack is starting. Backend services take ~30-90s to register with Eureka.
echo.
echo   Frontend         http://localhost:3000
echo   API Gateway      http://localhost:11032/actuator/health
echo   Eureka dashboard http://localhost:11024
echo.
echo   Tail logs:       deploy_docker_local.bat logs
echo   Stop:            deploy_docker_local.bat down
echo   Stop + wipe DBs: deploy_docker_local.bat clean
echo ============================================================================

endlocal
