# Scripts para Iniciar y Parar Microservicios

## Disponibles para Windows y Unix

### Windows (.bat)
- **start-all-services.bat** - Inicia todos los microservicios en Windows
- **stop-all-services.bat** - Detiene todos los microservicios en Windows

### Unix/Linux/Mac (.sh)
- **start-all-services.sh** - Inicia todos los microservicios en Unix
- **stop-all-services.sh** - Detiene todos los microservicios en Unix

## Requisitos Previos

### Windows
1. **Maven** - Instalado y en PATH
2. **PostgreSQL** - Corriendo en localhost:5432
3. **Java JDK 21+** - Instalado y configurado

### Unix/Linux/Mac
1. **Maven** - Instalado
2. **PostgreSQL** - Corriendo en localhost:5432
3. **Java JDK 21+** - Instalado
4. **curl** - Para verificar estado de servicios

## Uso

### En Windows
```cmd
REM Iniciar todos los servicios
start-all-services.bat

REM Detener todos los servicios
stop-all-services.bat
```

### En Unix/Linux/Mac
```bash
# Hacer ejecutables
chmod +x start-all-services.sh
chmod +x stop-all-services.sh

# Iniciar todos los servicios
./start-all-services.sh

# Detener todos los servicios
./stop-all-services.sh
```

## Servicios Iniciados

1. **Eureka Server** (Puerto 8761) - Service Registry
2. **API Gateway** (Puerto 8080) - Enrutador central
3. **Auth Service** (Puerto 8081) - Autenticación
4. **Search Service** (Puerto 8082) - Búsqueda de cartas
5. **Deck Service** (Puerto 8083) - Gestión de mazos

## Logs

Los logs de cada servicio se guardan en la carpeta `logs/`:
- `logs/eureka-server.log`
- `logs/api-gateway.log`
- `logs/auth-service.log`
- `logs/search-service.log`
- `logs/deck-service.log`

## Acceso a Servicios

- **Eureka Dashboard**: http://localhost:8761
- **API Gateway**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html

## Solución de Problemas

### Maven no está instalado
**Windows**: Instala Maven desde https://maven.apache.org/download.cgi y agrega a PATH
**Unix**: `brew install maven` (Mac) o `apt-get install maven` (Linux)

### PostgreSQL no está corriendo
**Windows**: Abre PostgreSQL desde Services o Command Line
**Unix**: `brew services start postgresql` (Mac) o `sudo service postgresql start` (Linux)

### Puerto ya en uso
Si un puerto está ocupado, edita los scripts y cambia el número de puerto en la sección correspondiente.

### Verificar procesos activos

**Windows**:
```cmd
tasklist | find "java"
```

**Unix**:
```bash
ps aux | grep java
```
