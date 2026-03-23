# ✅ Checklist de Implementación - Microservicios MTG Deck Builder

## 🎯 Fase 1: Infraestructura Base (COMPLETADA ✓)

- [x] Crear estructura de monorepo con POM padre
- [x] Crear Eureka Server (Service Discovery)
- [x] Crear API Gateway con Spring Cloud Gateway
- [x] Crear módulos de los 3 microservicios
- [x] Configurar Dockerfiles para cada servicio
- [x] Configurar docker-compose.yml
- [x] Crear scripts de inicio/parada
- [x] Documentación de arquitectura

## 🔐 Fase 2: Implementar Auth Service

### Auth Service - Backend

- [ ] Copiar `UserEntity.java` desde monolito ✓ (ya existe)
- [ ] Copiar `UserRepository.java` desde monolito ✓ (ya existe)
- [ ] Copiar `JwtService.java` desde monolito ✓ (ya existe)
- [ ] Copiar `UserPrincipal.java` desde monolito ✓ (ya existe)
- [ ] Copiar `AuthController.java` desde monolito ✓ (ya existe)
- [ ] Copiar `SecurityConfig.java` desde monolito ✓ (ya existe)
- [ ] Copiar `CustomUserDetailsService.java` desde monolito ✓ (ya existe)
- [ ] Copiar `JwtAuthenticationFilter.java` desde monolito ✓ (ya existe)
- [ ] Copiar DTOs: `AuthResponse.java`, `LoginRequest.java`, `RegisterRequest.java` ✓ (ya existe)
- [ ] Verificar dependencias en `pom.xml`
- [ ] Testing local con Postman/Insomnia
  - [ ] POST /api/auth/register → Auth Service
  - [ ] POST /api/auth/login → Auth Service
  - [ ] Verificar token JWT generado

## 🔍 Fase 3: Implementar Search Service

### Search Service - Backend

- [ ] Copiar `ScryfallService.java` desde monolito
- [ ] Copiar `ScryfallController.java` desde monolito
- [ ] Copiar DTOs: `CardDto.java`, `SearchResponseDto.java`, `TopCommanderDto.java`, etc.
- [ ] Actualizar `pom.xml` con dependencias necesarias
- [ ] Crear RestClient bean para Scryfall API
- [ ] Testing local con Postman
  - [ ] GET /api/scryfall/search?q=lightning
  - [ ] GET /api/scryfall/top-commanders
  - [ ] GET /api/scryfall/cards/{id}
  - [ ] GET /api/scryfall/cards/{id}/related

## 📦 Fase 4: Implementar Deck Service

### Deck Service - Backend

- [ ] Copiar `DeckEntity.java` desde monolito
- [ ] Copiar `DeckCardEntity.java` desde monolito
- [ ] Copiar `DeckRepository.java` desde monolito
- [ ] Copiar `DeckCardRepository.java` desde monolito
- [ ] Copiar `DeckController.java` desde monolito
- [ ] Copiar DTOs: `DeckRequest.java`, `DeckSummaryDto.java`, etc.
- [ ] Actualizar controlador para trabajar sin autenticación en endpoints públicos
- [ ] Implementar validación de JWT para endpoints protegidos
- [ ] Testing local con Postman
  - [ ] GET /api/decks/public
  - [ ] GET /api/decks/search?q=...
  - [ ] POST /api/decks (con token)
  - [ ] GET /api/decks/me (con token)
  - [ ] PUT /api/decks/{id} (con token)
  - [ ] DELETE /api/decks/{id} (con token)

## 🚀 Fase 5: Testing Integral

### Gateway Routing

- [ ] Verificar que todas las rutas funcionan a través del Gateway
  - [ ] http://localhost:8080/api/auth/login → auth-service
  - [ ] http://localhost:8080/api/scryfall/search → search-service
  - [ ] http://localhost:8080/api/decks → deck-service

### Eureka Registration

- [ ] Todos los servicios visible en Eureka Dashboard
  - [ ] http://localhost:8761 → debe mostrar 4 servicios
  - [ ] Health checks deben estar en GREEN

### End-to-End Flow

- [ ] [ ] 1. Registrar usuario en Auth Service
- [ ] [ ] 2. Iniciar sesión y obtener token JWT
- [ ] [ ] 3. Buscar cartas en Search Service
- [ ] [ ] 4. Crear deck protegido en Deck Service con token
- [ ] [ ] 5. Listar decks personales
- [ ] [ ] 6. Actualizar deck
- [ ] [ ] 7. Eliminar deck

### Frontend Integration

- [ ] Frontend conecta al Gateway (puerto 8080)
- [ ] Flujo de autenticación funciona
- [ ] Búsqueda de cartas funciona
- [ ] CRUD de decks funciona
- [ ] Decks públicos visibles sin autenticación

## 📊 Fase 6: Documentación

### Documentación de API

- [ ] Generar Swagger/OpenAPI para cada servicio
  - [ ] Auth Service: `/v3/api-docs`
  - [ ] Search Service: `/v3/api-docs`
  - [ ] Deck Service: `/v3/api-docs`
- [ ] Documentar cada endpoint
- [ ] Documentar payloads y responses
- [ ] Documentar errores posibles

### Documentación de Operaciones

- [ ] Guía de deploy local
- [ ] Guía de deploy con Docker
- [ ] Guía de escalado horizontal
- [ ] Guía de troubleshooting
- [ ] Runbook de operaciones

## 🐳 Fase 7: Containerización

### Docker

- [ ] Verificar Dockerfiles para cada servicio
- [ ] Build local de cada servicio
  ```bash
  docker build -t mtg-auth-service:latest backend/auth-service
  docker build -t mtg-search-service:latest backend/search-service
  docker build -t mtg-deck-service:latest backend/deck-service
  docker build -t mtg-eureka-server:latest backend/eureka-server
  docker build -t mtg-api-gateway:latest backend/api-gateway
  docker build -t mtg-frontend:latest .
  ```
- [ ] Prueba de docker-compose
  ```bash
  docker-compose -f backend/docker-compose.microservices.yml up -d
  docker-compose -f backend/docker-compose.microservices.yml ps
  ```

### Container Registry

- [ ] [ ] Subir imágenes a Docker Hub / Azure Container Registry
- [ ] [ ] Actualizar docker-compose.yml con URLs de registry

## 🔄 Fase 8: CI/CD

### GitHub Actions

- [ ] [ ] Crear workflow para build de cada servicio
- [ ] [ ] Crear workflow para testing
- [ ] [ ] Crear workflow para push a container registry
- [ ] [ ] Crear workflow para deploy

### Variables de Entorno

- [ ] [ ] Configurar secrets en GitHub
  - [ ] JWT_SECRET
  - [ ] DATABASE_URL
  - [ ] DB_USERNAME
  - [ ] DB_PASSWORD
  - [ ] REGISTRY_USERNAME
  - [ ] REGISTRY_TOKEN

## 📈 Fase 9: Observabilidad

### Logging

- [ ] [ ] Configurar SLF4J en cada servicio
- [ ] [ ] Agregar logs estructurados (JSON)
- [ ] [ ] Stack de logging centralizado (ELK / Splunk)

### Metrics

- [ ] [ ] Exponer métricas Prometheus
- [ ] [ ] Crear dashboards Grafana
- [ ] [ ] Alertas para problemas comunes

### Distributed Tracing

- [ ] [ ] Integrar Jaeger
- [ ] [ ] Propagar trace IDs entre servicios
- [ ] [ ] Visualizar traces en Jaeger UI

## 🎯 Fase 10: Production Readiness

### Security

- [ ] [ ] Validar todas las validaciones de input
- [ ] [ ] Implementar rate limiting
- [ ] [ ] HTTPS/TLS configuration
- [ ] [ ] SQL Injection prevention
- [ ] [ ] CORS configuration correcto
- [ ] [ ] JWT token expiration
- [ ] [ ] Refresh token mechanism

### Performance

- [ ] [ ] Optimizar queries de BD
- [ ] [ ] Implementar caching (Redis)
- [ ] [ ] Load testing de cada servicio
- [ ] [ ] Profiling de consumo de memoria

### Reliability

- [ ] [ ] Circuit breaker en place
- [ ] [ ] Retry logic configurada
- [ ] [ ] Fallback handlers
- [ ] [ ] Graceful shutdown
- [ ] [ ] Health check endpoints

## 🗄️ Próximas Iteraciones

### Base de Datos

- [ ] [ ] Separar BD por servicio (database per service pattern)
- [ ] [ ] Implementar data synchronization si es necesario
- [ ] [ ] Event-driven architecture para comunicación entre servicios

### Communication

- [ ] [ ] Evaluar Message Queue (RabbitMQ / Kafka)
- [ ] [ ] Async communication entre servicios
- [ ] [ ] Event sourcing si es aplicable

### Deployment

- [ ] [ ] Setup Kubernetes cluster
- [ ] [ ] Kubernetes manifests para cada servicio
- [ ] [ ] Helm charts
- [ ] [ ] Kustomize para ambiente-specific configs

---

## 📋 Resumen de Estado

### ✅ COMPLETADO
- Estructura de microservicios
- Eureka Server
- API Gateway
- Módulos básicos de Auth, Search, Deck Service
- Dockerfiles
- Documentación

### 🔄 EN PROGRESO
- Migración de código del monolito
- Testing

### 📋 TODO
- Search Service implementación completa
- Deck Service implementación completa
- Testing end-to-end
- CI/CD pipelines
- Production deployment

---

**Última Actualización:** Marzo 23, 2026
**Responsable:** Equipo de Desarrollo
**Estado General:** 30% Completado
