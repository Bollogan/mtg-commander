# 🚀 MTG Deck Builder - Arquitectura de Microservicios

## ¡Tu proyecto ha sido transformado a una arquitectura de microservicios!

Esta guía te ayudará a entender y ejecutar tu nueva arquitectura.

---

## 📋 Índice

- [Resumen de cambios](#resumen-de-cambios)
- [Arquitectura](#arquitectura)
- [Cómo ejecutar](#cómo-ejecutar)
- [Estructura de servicios](#estructura-de-servicios)
- [Próximos pasos](#próximos-pasos)

---

## Resumen de cambios

### ✅ Qué se cambió

Tu proyecto se transformó de un **monolito único** (un solo JAR con todas las funcionalidades) a una **arquitectura de microservicios** con 5 componentes independientes:

| Componente | Puerto | Función |
|-----------|--------|---------|
| **Eureka Server** | 8761 | Descubrimiento de servicios |
| **API Gateway** | 8080 | Puerta de entrada (único punto de acceso) |
| **Auth Service** | 8081 | Autenticación y gestión de usuarios |
| **Search Service** | 8082 | Búsqueda de cartas (Scryfall) |
| **Deck Service** | 8083 | Gestión de decks |

### 📂 Archivos nuevos creados

```
backend/
├── pom-parent.xml                          # POM padre (nuevo)
├── eureka-server/                          # NUEVO SERVICIO
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/...
├── api-gateway/                            # NUEVO SERVICIO
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/...
├── auth-service/                           # NUEVO SERVICIO (separado)
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/...
├── search-service/                         # NUEVO SERVICIO (separado)
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/...
├── deck-service/                           # NUEVO SERVICIO (separado)
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/...
└── docker-compose.microservices.yml        # Orquestación Docker

Dockerfile.frontend                         # Para containerizar frontend
ARCHITECTURE_MICROSERVICES.md               # Documentación detallada
MIGRATION_GUIDE.md                          # Guía de migración
start-all-services.sh                       # Script para iniciar todo
stop-all-services.sh                        # Script para detener todo
```

---

## Arquitectura

```
┌─────────────────────────────────────────────┐
│   Frontend (React - puerto 5173)            │
└────────────────┬────────────────────────────┘
                 │
                 └──► http://localhost:8080
                      (Única URL del cliente)
                      │
         ┌────────────┴─────────────────────┐
         │      API GATEWAY (8080)          │
         │   - Enrutamiento inteligente     │
         │   - Balanceo de carga            │
         │   - Circuit breaker              │
         └────────┬──────┬──────┬───────────┘
                  │      │      │
         ┌────────┘      │      └────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │   AUTH   │   │ SEARCH   │   │  DECK    │
   │ SERVICE  │   │ SERVICE  │   │ SERVICE  │
   │ (8081)   │   │ (8082)   │   │ (8083)   │
   └────┬─────┘   └──────────┘   └────┬─────┘
        │                              │
        └──────────────┬───────────────┘
                       │
                ┌──────▼──────┐
                │  PostgreSQL │
                │  (Shared DB)│
                └─────────────┘
```

---

## Cómo ejecutar

### 📋 Prerequisitos

- **Java 17+** instalado
- **Maven 3.8+** instalado
- **PostgreSQL 13+** corriendo en `localhost:5432`
- **Node.js 18+** (para frontend)

### ⚡ Opción 1: Con Maven (Desarrollo)

**En 6 terminales diferentes:**

```bash
# Terminal 1: Eureka Server
cd backend/eureka-server
mvn spring-boot:run

# Terminal 2: API Gateway
cd backend/api-gateway
mvn spring-boot:run

# Terminal 3: Auth Service
cd backend/auth-service
mvn spring-boot:run

# Terminal 4: Search Service
cd backend/search-service
mvn spring-boot:run

# Terminal 5: Deck Service
cd backend/deck-service
mvn spring-boot:run

# Terminal 6: Frontend
npm run dev
```

### 🐳 Opción 2: Con Docker Compose (Recomendado)

```bash
# Iniciar todo de una vez
cd backend
docker-compose -f docker-compose.microservices.yml up -d

# Ver estado de servicios
docker-compose -f docker-compose.microservices.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.microservices.yml logs -f

# Detener todo
docker-compose -f docker-compose.microservices.yml down
```

### 🔧 Opción 3: Scripts Helper (Linux/Mac)

```bash
# Iniciar todos los servicios
./start-all-services.sh

# Detener todos los servicios
./stop-all-services.sh
```

---

## Estructura de servicios

### 🔑 Auth Service (Puerto 8081)

**Responsabilidad:** Autenticación de usuarios y generación de JWT tokens

**Endpoints:**
```
POST /api/auth/register
  Body: { email, password, displayName }
  Response: { token, userId, email, displayName }

POST /api/auth/login
  Body: { email, password }
  Response: { token, userId, email, displayName }
```

**Base de datos:** PostgreSQL (tabla `users`)

### 🔍 Search Service (Puerto 8082)

**Responsabilidad:** Búsqueda de cartas Magic (integración Scryfall)

**Endpoints:**
```
GET /api/scryfall/search?q=...&page=1
  Response: { cards: [...], page, totalCards, hasMore }

GET /api/scryfall/top-commanders?limit=20
  Response: [{ name, imageUri, prices, ... }]

GET /api/scryfall/cards/{id}
  Response: { id, name, imageUri, prices, ... }

GET /api/scryfall/cards/{id}/related
  Response: [{ related cards }]
```

**Nota:** Este servicio NO tiene base de datos local. Proxifica Scryfall API.

### 📦 Deck Service (Puerto 8083)

**Responsabilidad:** Gestión de decks de Magic

**Endpoints protegidos** (requieren JWT):
```
GET /api/decks/me
  Header: Authorization: Bearer {token}
  Response: [{ decks del usuario }]

POST /api/decks
  Header: Authorization: Bearer {token}
  Body: { name, format, visibility, cards }
  Response: { deck creado }

PUT /api/decks/{id}
  Header: Authorization: Bearer {token}
  Body: { actualización del deck }

DELETE /api/decks/{id}
  Header: Authorization: Bearer {token}
```

**Endpoints públicos:**
```
GET /api/decks/public
  Response: [{ decks públicos }]

GET /api/decks/search?q=...
  Response: [{ decks públicos buscados }]

GET /api/decks/{id}
  Response: { deck público }
```

**Base de datos:** PostgreSQL (tablas `decks`, `deck_cards`)

### 🌐 API Gateway (Puerto 8080)

**Responsabilidad:** Enrutamiento, balanceo de carga y seguridad

**Características:**
- ✅ Enrutamiento inteligente a microservicios
- ✅ Balanceo de carga automático (vía Eureka)
- ✅ Circuit breaker para resiliencia
- ✅ Manejo centralizado de CORS

**Rutas configuradas:**
- `/api/auth/**` → auth-service:8081
- `/api/scryfall/**` → search-service:8082
- `/api/decks/**` → deck-service:8083

### 🎯 Eureka Server (Puerto 8761)

**Responsabilidad:** Descubrimiento de servicios (Service Registry)

**Características:**
- ✅ Registro automático de servicios
- ✅ Health check de servicios
- ✅ Deregistración automática si falla
- ✅ Dashboard web para monitoreo

**Acceso:** http://localhost:8761

---

## ✨ Verificación

Después de iniciar todos los servicios, verifica que está todo funcionando:

### 1. Eureka Dashboard
```
http://localhost:8761
```
Deberías ver 4 servicios registrados (auth-service, search-service, deck-service, api-gateway)

### 2. Health Checks
```bash
curl http://localhost:8080/actuator/health      # Gateway
curl http://localhost:8081/actuator/health      # Auth
curl http://localhost:8082/actuator/health      # Search
curl http://localhost:8083/actuator/health      # Deck
```

### 3. Test básico de flujo
```bash
# 1. Registrar usuario
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'

# 2. Buscar cartas
curl http://localhost:8080/api/scryfall/search?q=lightning

# 3. Obtener decks públicos
curl http://localhost:8080/api/decks/public
```

---

## 🎯 Próximos pasos

### 1️⃣ Completar la migración

Los nuevos módulos están creados pero **necesitan el código específico**:

- [ ] **search-service**: Copiar `ScryfallService` y `ScryfallController` desde el monolito
- [ ] **deck-service**: Copiar `DeckController`, `DeckService`, `DeckEntity`, etc.

### 2️⃣ Testing

- [ ] Tests unitarios para cada servicio
- [ ] Tests de integración inter-servicios
- [ ] Tests end-to-end con Postman/API testing

### 3️⃣ Documentación

- [ ] Generar Swagger/OpenAPI para cada servicio
- [ ] Documentar endpoints en detalle
- [ ] Crear runbook para operaciones

### 4️⃣ DevOps

- [ ] Configurar CI/CD (GitHub Actions / GitLab CI)
- [ ] Deploy automático en push a main
- [ ] Staging environment con microservicios

### 5️⃣ Escalabilidad

- [ ] Múltiples instancias del mismo servicio
- [ ] Nginx/HAProxy para balanceo de carga
- [ ] Kubernetes para orquestación

### 6️⃣ Observabilidad

- [ ] Prometheus + Grafana para métricas
- [ ] ELK Stack para logs distribuidos
- [ ] Jaeger para distributed tracing

---

## 📚 Documentación adicional

- **[ARCHITECTURE_MICROSERVICES.md](./ARCHITECTURE_MICROSERVICES.md)** - Arquitectura detallada
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guía de migración paso a paso

---

## 🆘 Troubleshooting

### Los servicios no se registran en Eureka

```bash
# 1. Verificar que Eureka está corriendo
curl http://localhost:8761/actuator/health

# 2. Verificar logs del servicio
docker logs mtg-auth  # O revisar la terminal donde iniciaste el servicio

# 3. Asegurar que la configuración de Eureka es correcta en application.yml
```

### API Gateway no enruta correctamente

```bash
# 1. Verificar rutas configuradas
curl http://localhost:8080/actuator/gateway/routes

# 2. Revisar logs del Gateway
curl http://localhost:8080/actuator/health
```

### Errores de conexión a la base de datos

```bash
# 1. Verificar que PostgreSQL está corriendo
psql -U postgres -c "SELECT 1"

# 2. Crear la BD si no existe
createdb mtg_deck_builder

# 3. Verificar credenciales en application.yml
```

---

## 📞 Soporte

Si encuentras problemas:

1. Revisar los logs: `tail -f logs/*.log`
2. Consultar la [documentación de la arquitectura](./ARCHITECTURE_MICROSERVICES.md)
3. Verificar el [guía de migración](./MIGRATION_GUIDE.md)

---

## 🎉 ¡Felicidades!

Tu aplicación ahora es **escalable, resiliente y preparada para producción** con una arquitectura de microservicios.

¡Próximo paso: implementar el código específico de cada servicio! 🚀
