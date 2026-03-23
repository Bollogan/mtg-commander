# Guía de Migración a Microservicios - MTG Deck Builder

## 📌 Resumen

Se ha restructurado el proyecto de una **arquitectura monolítica** a una **arquitectura de microservicios** con los siguientes cambios principales:

### Estructura Anterior
```
backend/
├── pom.xml (monolito único)
├── src/main/java/com/mtg/deckbuilder/
│   ├── auth/
│   ├── controller/
│   ├── deck/
│   ├── dto/
│   ├── service/
│   └── user/
```

### Nueva Estructura
```
backend/
├── pom-parent.xml (POM padre con módulos)
├── eureka-server/         # Descubrimiento de servicios
│   ├── pom.xml
│   └── src/...
├── api-gateway/          # Puerta de entrada (puerto 8080)
│   ├── pom.xml
│   └── src/...
├── auth-service/         # Autenticación (puerto 8081)
│   ├── pom.xml
│   └── src/...
├── search-service/       # Búsqueda de cartas (puerto 8082)
│   ├── pom.xml
│   └── src/...
└── deck-service/         # Gestión de decks (puerto 8083)
    ├── pom.xml
    └── src/...
```

## 🔄 Pasos de Migración

### Opción A: Mantener Ambos (Recomendado para Transición Gradual)

1. **Mantener el monolito original** como fallback
2. **Crear nuevos módulos de microservicios** en paralelo
3. **Migrar gradualmente** el tráfico al Gateway

### Opción B: Migración Total Inmediata

1. **Renombrar `pom.xml` antiguo**:
   ```bash
   cd backend
   mv pom.xml pom-monolith-backup.xml
   ```

2. **Renombrar el nuevo POM padre**:
   ```bash
   mv pom-parent.xml pom.xml
   ```

3. **Construir todos los módulos**:
   ```bash
   cd backend
   mvn clean package
   ```

## 🚀 Cómo Ejecutar en Desarrollo

### Con Maven (Local)

**Terminal 1 - Eureka Server:**
```bash
cd backend/eureka-server
mvn spring-boot:run
# http://localhost:8761
```

**Terminal 2 - API Gateway:**
```bash
cd backend/api-gateway
mvn spring-boot:run
# http://localhost:8080
```

**Terminal 3 - Auth Service:**
```bash
cd backend/auth-service
mvn spring-boot:run
# http://localhost:8081
```

**Terminal 4 - Search Service:**
```bash
cd backend/search-service
mvn spring-boot:run
# http://localhost:8082
```

**Terminal 5 - Deck Service:**
```bash
cd backend/deck-service
mvn spring-boot:run
# http://localhost:8083
```

**Terminal 6 - Frontend:**
```bash
npm run dev
# http://localhost:5173
```

### Con Docker Compose (Recomendado para Staging/Prod)

```bash
cd backend
docker-compose -f docker-compose.microservices.yml up -d

# Verificar que todos los servicios están corriendo:
docker-compose -f docker-compose.microservices.yml ps

# Ver logs:
docker-compose -f docker-compose.microservices.yml logs -f eureka-server
docker-compose -f docker-compose.microservices.yml logs -f api-gateway
docker-compose -f docker-compose.microservices.yml logs -f auth-service
docker-compose -f docker-compose.microservices.yml logs -f search-service
docker-compose -f docker-compose.microservices.yml logs -f deck-service

# Detener todos los servicios:
docker-compose -f docker-compose.microservices.yml down
```

## 🔍 Verificación de Servicios

### Eureka Dashboard
```
http://localhost:8761
```
Debe mostrar los 4 servicios registrados:
- auth-service
- search-service  
- deck-service
- api-gateway

### API Gateway Health
```
curl http://localhost:8080/actuator/health
```

### Auth Service Health
```
curl http://localhost:8081/actuator/health
```

## 🔐 Variables de Entorno Críticas

Crear archivo `.env` en raíz del proyecto o en `backend/`:

```env
JWT_SECRET=SGVsbG8gV29ybGQgVGhpcyBpcyBhIFNlY3JldCBLZXkgZm9yIEpXVCBFbmNvZGluZw==
DATABASE_URL=jdbc:postgresql://localhost:5432/mtg_deck_builder
DB_USERNAME=postgres
DB_PASSWORD=postgres
EUREKA_URL=http://localhost:8761/eureka/
```

## 📊 Diagrama de Flujo de Requests

```
┌─────────────────────────────────────────────────┐
│  Frontend (React) - localhost:5173              │
└────────────────────┬────────────────────────────┘
                     │
                     └──► http://localhost:8080 (Única URL)
                           │
                    ┌──────┴──────────────┐
                    │   API GATEWAY       │
                    │  (Port 8080)        │
                    └──────┬──┬────┬──────┘
                           │  │    │
                ┌──────────┘  │    └───────────┐
                │             │                │
                ▼             ▼                ▼
        ┌──────────────┐ ┌──────────┐ ┌─────────────┐
        │ Auth Service │ │ Search   │ │ Deck        │
        │ (8081)       │ │ Service  │ │ Service     │
        │              │ │ (8082)   │ │ (8083)      │
        │ /api/auth/** │ │          │ │             │
        │              │ │/api/     │ │ /api/       │
        │ - register   │ │scryfall/ │ │ decks/**    │
        │ - login      │ │**        │ │             │
        │              │ │          │ │ - CRUD      │
        │              │ │ - search │ │ - own decks │
        │              │ │ - top    │ │ - public    │
        │              │ │ - cards  │ │ - search    │
        └──────┬───────┘ └──────────┘ └─────────────┘
               │
               └──► PostgreSQL (Shared DB)
                    - users table
                    - decks table
                    - deck_cards table
```

## 📋 Cambios en el Frontend

El frontend **NO requiere cambios importantes**. Solo verifica:

1. **Variable de entorno** (`src/services/scryfallApi.ts`):
   ```typescript
   const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
   ```
   ✅ Ya está configurada correctamente

2. **En development** (.env.local):
   ```
   VITE_API_BASE=http://localhost:8080
   ```

3. **En production** (.env.production):
   ```
   VITE_API_BASE=https://tu-dominio.com/api-gateway
   ```

## 🔧 Debugging y Troubleshooting

### Eureka no muestra los servicios
```bash
# Verificar logs de Eureka
curl http://localhost:8761/actuator/health

# Verificar que los servicios están registrados
curl http://localhost:8761/eureka/apps
```

### El Gateway no enruta correctamente
```bash
# Revisar logs del Gateway
docker logs mtg-gateway  # Si usas Docker

# O desde terminal:
cd backend/api-gateway
mvn spring-boot:run -Dspring-boot.run.arguments="--debug"
```

### Base de datos no encuentra tablas
```bash
# Asegurar que la BD está corriendo
psql -U postgres -d mtg_deck_builder -c "\dt"

# Si las tablas no existen, ejecutar migraciones (si tienes Flyway/Liquibase)
# O crear manualmente desde los esquemas del monolito original
```

## 📈 Siguiente Fase: Escalabilidad

Una vez los microservicios están funcionando:

1. **Múltiples instancias**: Ejecutar varios search-service con puertos diferentes
2. **Load Balancing**: Nginx o HAProxy frente a los servicios
3. **Kubernetes**: Orchestration con K8s para auto-scaling
4. **CI/CD**: GitHub Actions para deployments automáticos
5. **Monitoring**: Prometheus + Grafana para métricas
6. **Logging**: ELK Stack para logs distribuidos

## ⚠️ Consideraciones Importantes

1. **Base de datos compartida** (por ahora): Todos los servicios usan la misma BD
   - Próximo paso: **Database per Service pattern**

2. **JWT Token** debe ser el mismo en todos los servicios:
   ```yaml
   security:
     jwt:
       secret: ${JWT_SECRET}  # Debe ser idéntico en todos
   ```

3. **Actuator endpoints** están expuestos para health checks:
   - Auth Service: `http://localhost:8081/actuator/health`
   - Search Service: `http://localhost:8082/actuator/health`
   - Deck Service: `http://localhost:8083/actuator/health`

4. **CORS** puede necesitar ajustes si frontend y backend están en dominios diferentes

## 📚 Archivos Nuevos Creados

```
✅ backend/pom-parent.xml                          # POM padre del monorepo
✅ backend/eureka-server/pom.xml                   # Eureka Server
✅ backend/eureka-server/Dockerfile
✅ backend/eureka-server/src/main/resources/application.yml
✅ backend/api-gateway/pom.xml                     # API Gateway
✅ backend/api-gateway/Dockerfile
✅ backend/api-gateway/src/main/resources/application.yml
✅ backend/auth-service/pom.xml                    # Auth Service
✅ backend/auth-service/Dockerfile
✅ backend/auth-service/src/main/resources/application.yml
✅ backend/auth-service/src/main/java/com/mtg/deckbuilder/auth/**
✅ backend/search-service/pom.xml                  # Search Service
✅ backend/search-service/Dockerfile
✅ backend/search-service/src/main/resources/application.yml
✅ backend/deck-service/pom.xml                    # Deck Service
✅ backend/deck-service/Dockerfile
✅ backend/deck-service/src/main/resources/application.yml
✅ backend/docker-compose.microservices.yml
✅ Dockerfile.frontend
✅ ARCHITECTURE_MICROSERVICES.md
✅ MIGRATION_GUIDE.md (este archivo)
```

## 🎯 Próximos Pasos

1. **Copiar código**: Migrar ScryfallService → search-service
2. **Copiar código**: Migrar DeckController/DeckService → deck-service
3. **Testing**: Pruebas unitarias e integración para cada servicio
4. **API Documentation**: Generar Swagger/OpenAPI para cada servicio
5. **Performance**: Optimizar llamadas inter-servicios con caching

¡Tu arquitectura de microservicios está lista! 🚀
