# Arquitectura de Microservicios - MTG Deck Builder

## 📋 Descripción General

El proyecto se ha transformado de una arquitectura monolítica a una **arquitectura de microservicios** con service discovery y API Gateway. Esta arquitectura mejora la escalabilidad, mantenibilidad y resiliencia del sistema.

## 🏗️ Componentes Principales

### 1. **Eureka Server** (Puerto 8761)
- **Descripción**: Servidor de descubrimiento de servicios (Service Discovery)
- **Funciones**:
  - Registro dinámico de microservicios
  - Detección de salud de servicios
  - Balanceo de carga inteligente
- **Ubicación**: `backend/eureka-server/`
- **Comando de inicio**: `mvn spring-boot:run` (desde eureka-server)
- **URL de Consola**: http://localhost:8761

### 2. **API Gateway** (Puerto 8080)
- **Descripción**: Puerta de entrada única para todos los clientes
- **Funciones**:
  - Enrutamiento inteligente de requests
  - Balanceo de carga
  - Circuit breaker para resiliencia
  - Rate limiting (configurable)
- **Ubicación**: `backend/api-gateway/`
- **Comando de inicio**: `mvn spring-boot:run` (desde api-gateway)
- **Rutas Configuradas**:
  - `/api/auth/**` → auth-service:8081
  - `/api/scryfall/**` → search-service:8082
  - `/api/decks/**` → deck-service:8083

### 3. **Auth Service** (Puerto 8081)
- **Descripción**: Servicio de autenticación y gestión de usuarios
- **Responsabilidades**:
  - Registro de usuarios
  - Autenticación (login)
  - Generación y validación de JWT tokens
  - Gestión de entidades de usuario
- **Ubicación**: `backend/auth-service/`
- **Endpoints Públicos**:
  - `POST /api/auth/register` - Registrar nuevo usuario
  - `POST /api/auth/login` - Iniciar sesión
- **Base de Datos**: PostgreSQL compartida (tabla `users`)
- **Comando de inicio**: `mvn spring-boot:run` (desde auth-service)

### 4. **Search Service** (Puerto 8082)
- **Descripción**: Servicio de búsqueda de cartas (integración Scryfall)
- **Responsabilidades**:
  - Búsqueda de cartas con paginación
  - Obtención de top comandantes
  - Detalles de cartas específicas
  - Cartas relacionadas
- **Ubicación**: `backend/search-service/`
- **Endpoints Públicos** (no requieren autenticación):
  - `GET /api/scryfall/search?q=...` - Buscar cartas
  - `GET /api/scryfall/top-commanders?limit=20` - Top comandantes
  - `GET /api/scryfall/cards/{id}` - Detalle de carta
  - `GET /api/scryfall/cards/{id}/related` - Cartas relacionadas
- **Integración Externa**: api.scryfall.com
- **Comando de inicio**: `mvn spring-boot:run` (desde search-service)

### 5. **Deck Service** (Puerto 8083)
- **Descripción**: Servicio de gestión de decks
- **Responsabilidades**:
  - CRUD de decks
  - Validación de autorización
  - Búsqueda y filtrado de decks públicos
  - Gestión de cartas en decks
- **Ubicación**: `backend/deck-service/`
- **Endpoints Protegidos** (requieren JWT):
  - `GET /api/decks/me` - Mis decks (autenticado)
  - `POST /api/decks` - Crear deck (autenticado)
  - `PUT /api/decks/{id}` - Actualizar deck (autenticado)
  - `DELETE /api/decks/{id}` - Eliminar deck (autenticado)
- **Endpoints Públicos**:
  - `GET /api/decks/public` - Listar decks públicos
  - `GET /api/decks/search?q=...` - Buscar decks públicos
  - `GET /api/decks/{id}` - Detalle de deck público
- **Base de Datos**: PostgreSQL (tablas `decks`, `deck_cards`)
- **Comando de inicio**: `mvn spring-boot:run` (desde deck-service)

## 🔄 Flujo de Comunicación

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
└────────┬────────┘
         │
         ├─── http://localhost:8080 (Única entrada)
         │
         ▼
┌─────────────────────────────┐
│   API Gateway (8080)        │
│  - Enrutamiento             │
│  - Balanceo de carga        │
│  - Circuit breaker          │
└────┬─────────┬─────────┬────┘
     │         │         │
     ▼         ▼         ▼
┌─────────┐ ┌──────────┐ ┌──────────┐
│ Auth    │ │ Search   │ │ Deck     │
│ Service │ │ Service  │ │ Service  │
│ :8081   │ │ :8082    │ │ :8083    │
└────┬────┘ └────┬─────┘ └────┬─────┘
     │           │            │
     └─────┬─────┴─────┬──────┘
           │           │
           ▼           ▼
      ┌──────────┐  ┌──────────┐
      │  Eureka  │  │PostgreSQL│
      │ :8761    │  │   DB     │
      └──────────┘  └──────────┘
```

## 🚀 Cómo Iniciar los Servicios

### Prerequisitos
- Java 17 o superior
- Maven 3.8+
- PostgreSQL 13+ corriendo en localhost:5432
- Eureka debe iniciarse primero

### Opción 1: Iniciar Cada Servicio Manualmente

```bash
# Terminal 1 - Eureka Server
cd backend/eureka-server
mvn spring-boot:run

# Terminal 2 - API Gateway
cd backend/api-gateway
mvn spring-boot:run

# Terminal 3 - Auth Service
cd backend/auth-service
mvn spring-boot:run

# Terminal 4 - Search Service
cd backend/search-service
mvn spring-boot:run

# Terminal 5 - Deck Service
cd backend/deck-service
mvn spring-boot:run

# Terminal 6 - Frontend
npm run dev
```

### Opción 2: Usando Docker Compose

Se puede crear un `docker-compose.yml` en la raíz que inicie todos los servicios automáticamente (próximo paso).

## 📊 Health Checks y Monitoring

Cada servicio expone endpoints de actuator:

```
# Health
http://localhost:8761/actuator/health     (Eureka)
http://localhost:8080/actuator/health     (Gateway)
http://localhost:8081/actuator/health     (Auth)
http://localhost:8082/actuator/health     (Search)
http://localhost:8083/actuator/health     (Deck)

# Metrics
http://localhost:{port}/actuator/metrics
```

## 🔐 Seguridad

### JWT Token Flow
1. Cliente se autentica en `/api/auth/login` (Auth Service)
2. Server retorna JWT token
3. Cliente incluye token en header: `Authorization: Bearer {token}`
4. Gateway valida y propaga requests a microservicios
5. Cada servicio valida el JWT

### Variables de Entorno Críticas
```
JWT_SECRET=tu-clave-secreta-base64
DATABASE_URL=jdbc:postgresql://localhost:5432/mtg_deck_builder
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

## 📈 Escalabilidad

### Horizontal Scaling
Gracias a Eureka y el Gateway, es fácil escalar:

```bash
# Ejecutar múltiples instancias del mismo servicio
cd backend/auth-service
mvn spring-boot:run -Dserver.port=8081
mvn spring-boot:run -Dserver.port=8081-replica-1
mvn spring-boot:run -Dserver.port=8081-replica-2
```

El Gateway automáticamente balanceará carga entre instancias.

## 🔧 Configuración de Rutas en API Gateway

El archivo `api-gateway/src/main/resources/application.yml` contiene la configuración de rutas:

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: auth-service
          uri: lb://auth-service  # lb = load balanced
          predicates:
            - Path=/api/auth/**
```

## 📝 Cambios desde la Arquitectura Original

| Aspecto | Antes (Monolito) | Ahora (Microservicios) |
|--------|------------------|----------------------|
| **Puerto Principal** | 8080 | Gateway: 8080, Servicios: 8081+ |
| **Base Datos** | Una sola | Compartida, preparada para separación |
| **Descubrimiento** | Hard-coded | Eureka automático |
| **Escalabilidad** | Escalar toda app | Escalar servicio específico |
| **Resiliencia** | Todo muere si un endpoint falla | Aislamiento con circuit breaker |
| **Deployment** | Un JAR | 5+ servicios independientes |

## 🎯 Próximos Pasos Sugeridos

1. **Containerizar**: Crear Dockerfiles para cada servicio
2. **Orquestación**: Usar Kubernetes para gestionar contenedores
3. **CI/CD**: GitHub Actions/GitLab CI para deployments automáticos
4. **Config Server**: Centralizar configuración (Spring Cloud Config)
5. **Logging Distribuido**: ELK Stack o similares
6. **Tracing**: Jaeger para distributed tracing
7. **Shared Database** → **Database per Service**: Separar bases de datos

## 📚 Referencias

- [Spring Cloud Netflix](https://spring.io/projects/spring-cloud-netflix)
- [Spring Cloud Gateway](https://spring.io/projects/spring-cloud-gateway)
- [Microservices Patterns](https://microservices.io/)
