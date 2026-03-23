#!/bin/bash

# Script para detener todos los microservicios del MTG Deck Builder
# Uso: ./stop-all-services.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deteniendo Microservicios${NC}"
echo -e "${GREEN}========================================${NC}"

# Array de servicios
services=("eureka-server" "api-gateway" "auth-service" "search-service" "deck-service")

for service in "${services[@]}"; do
    pid_file="$SCRIPT_DIR/.${service}.pid"
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}Deteniendo $service (PID: $pid)...${NC}"
            kill $pid
            rm "$pid_file"
            echo -e "${GREEN}✓ $service detenido${NC}"
        else
            echo -e "${YELLOW}$service no está corriendo${NC}"
            rm "$pid_file"
        fi
    else
        echo -e "${YELLOW}$service no tiene archivo PID${NC}"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Todos los servicios detenidos${NC}"
echo -e "${GREEN}========================================${NC}"
