#!/bin/bash

# Script para iniciar todos los microservicios del MTG Deck Builder
# Uso: ./start-all-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MTG Deck Builder - Microservicios Start${NC}"
echo -e "${GREEN}========================================${NC}"

# Verificar que Maven está instalado
if ! command -v mvn &> /dev/null; then
    echo -e "${RED}Maven no está instalado. Por favor instala Maven primero.${NC}"
    exit 1
fi

# Verificar que PostgreSQL está corriendo
echo -e "${YELLOW}Verificando PostgreSQL...${NC}"
if ! pg_isready -h localhost -p 11020 &> /dev/null; then
    echo -e "${RED}PostgreSQL no está corriendo en localhost:11020${NC}"
    echo -e "${YELLOW}Inicia PostgreSQL antes de continuar.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL corriendo${NC}"

# Crear directorio para logs si no existe
mkdir -p "$SCRIPT_DIR/logs"

# Función para iniciar un servicio en background
start_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3
    local log_file="$SCRIPT_DIR/logs/${service_name}.log"

    echo -e "${YELLOW}Iniciando $service_name (puerto $port)...${NC}"
    
    cd "$service_dir"
    mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=$port" > "$log_file" 2>&1 &
    
    local pid=$!
    echo "$pid" > "$SCRIPT_DIR/.${service_name}.pid"
    
    # Dar tiempo para que el servicio inicie
    sleep 3
    
    # Verificar si el servicio arrancó correctamente
    if ps -p $pid > /dev/null; then
        echo -e "${GREEN}✓ $service_name iniciado (PID: $pid)${NC}"
    else
        echo -e "${RED}✗ Error al iniciar $service_name${NC}"
        cat "$log_file"
        exit 1
    fi
}

# Iniciar Eureka Server (debe ser primero)
start_service "eureka-server" "$BACKEND_DIR/eureka-server" "11024"

# Esperar a que Eureka esté listo
echo -e "${YELLOW}Esperando a que Eureka Server esté disponible...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:11024/eureka-mtgc/actuator/health &> /dev/null; then
        echo -e "${GREEN}✓ Eureka Server está disponible${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Eureka Server no respondió en tiempo esperado${NC}"
        exit 1
    fi
    sleep 1
done

# Iniciar API Gateway
start_service "api-gateway" "$BACKEND_DIR/api-gateway" "11032"

# Iniciar Auth Service
start_service "auth-service" "$BACKEND_DIR/auth-service" "11028"

# Iniciar Search Service
start_service "search-service" "$BACKEND_DIR/search-service" "11030"

# Iniciar Deck Service
start_service "deck-service" "$BACKEND_DIR/deck-service" "8083"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Todos los servicios iniciados${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Servicios disponibles:${NC}"
echo -e "  Eureka Dashboard:    ${GREEN}http://localhost:11024/eureka-mtgc/${NC}"
echo -e "  API Gateway:         ${GREEN}http://localhost:11032${NC}"
echo -e "  Auth Service:        ${GREEN}http://localhost:11028${NC}"
echo -e "  Search Service:      ${GREEN}http://localhost:11030${NC}"
echo -e "  Deck Service:        ${GREEN}http://localhost:8083${NC}"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  tail -f logs/eureka-server.log"
echo -e "  tail -f logs/api-gateway.log"
echo -e "  tail -f logs/auth-service.log"
echo -e "  tail -f logs/search-service.log"
echo -e "  tail -f logs/deck-service.log"
echo ""
echo -e "${YELLOW}Para detener todos los servicios, ejecuta:${NC}"
echo -e "  ./stop-all-services.sh"
