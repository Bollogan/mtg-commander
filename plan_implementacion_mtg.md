# Plan de Implementación: Plataforma Social MTG — Arquitectura de Microservicios

## Resumen Ejecutivo
- **Stack tecnológico:**
  - Backend: Java 17 + Spring Boot 3 + Spring Cloud (Eureka, Gateway, OpenFeign, Config)
  - Frontend: React.js + Redux Toolkit
  - DBs: PostgreSQL (datos relacionales) · MongoDB (mazos, foros) · Redis (caché, sesiones, estado partidas)
  - Mensajería: WebSocket STOMP (game-service, notification-service)
  - DevOps: Docker Compose (orquestación local y CI) · GitHub Actions (CI/CD)
  - Integración externa: Scryfall REST API
- **Duración estimada:** 5 fases (~4–6 semanas a tiempo parcial)
- **Riesgos críticos:**
  - Race condition en arranque Eureka → Gateway → servicios de dominio
  - Estado WebSocket distribuido en game-service con Redis Pub/Sub
  - Módulo IA externo como dependencia de tercero (comunidad MTG)

---

## Mapa de Microservicios

```
                        ┌─────────────────────┐
                        │    eureka-server     │  :8761
                        │  (Service Registry)  │
                        └──────────┬──────────┘
                                   │ registro
          ┌────────────────────────▼────────────────────────┐
          │                   api-gateway                    │  :8080
          │   (Spring Cloud Gateway + JWT filter global)     │
          └───┬──────────┬──────────┬──────────┬────────────┘
              │          │          │          │
         auth-svc   user-svc   forum-svc  deck-svc   game-svc   ai-svc   notification-svc
          :8081      :8082      :8083      :8084      :8085      :8086       :8087
            │          │          │          │
         PostgreSQL PostgreSQL  MongoDB   MongoDB
                                           + Redis
```

| Servicio | Puerto | DB | Responsabilidad |
|---|---|---|---|
| `eureka-server` | 8761 | — | Registro y descubrimiento de servicios |
| `api-gateway` | 8080 | — | Routing, filtro JWT global, rate limiting |
| `auth-service` | 8081 | PostgreSQL | Registro, login, refresh token, emisión JWT |
| `user-service` | 8082 | PostgreSQL | Perfiles, seguidores, badges, leaderboard |
| `forum-service` | 8083 | MongoDB | Foros, posts, comentarios, eventos colaborativos |
| `deck-service` | 8084 | MongoDB + Redis | CRUD mazos, stats, integración Scryfall, caché |
| `game-service` | 8085 | Redis | Simulador WebSocket STOMP, estado de partidas |
| `ai-service` | 8086 | — | Proxy al módulo IA externo, recomendaciones |
| `notification-service` | 8087 | Redis Pub/Sub | Push de notificaciones en tiempo real (SSE/WS) |
| `frontend` | 3000 | — | React + Redux, consume api-gateway |

---

## Estructura de Directorios Esperada

```
mtg-platform/
├── eureka-server/
├── api-gateway/
├── auth-service/
├── user-service/
├── forum-service/
├── deck-service/
├── game-service/
├── ai-service/
├── notification-service/
├── frontend/
├── docker-compose.yml
├── docker-compose.override.yml
└── .github/
    └── workflows/
        └── ci.yml
```

> ⚠️ **Nota sobre código existente:** Es posible que algunas partes del proyecto ya estén implementadas, parcialmente o en su totalidad. Antes de comenzar cualquier fase:
> - Explorar el directorio raíz y mapear qué existe
> - Reutilizar y adaptar el código existente siempre que sea compatible con la arquitectura definida
> - Mover ficheros a la estructura de directorios correcta si están mal ubicados
> - Refactorizar solo lo estrictamente necesario para cumplir los criterios de verificación
> - No eliminar código existente sin justificación técnica explícita; preferir moverlo o extenderlo

---

## Fase 1: Infraestructura Base — Eureka + Gateway + Auth Service

### Contexto
Establece los tres servicios de los que dependen todos los demás. Sin Eureka no hay discovery; sin Gateway no hay enrutamiento ni seguridad centralizada; sin auth-service no hay JWT.

### Tareas
1. Scaffolding de todos los módulos Maven con `spring-boot-starter`, BOM `spring-cloud-dependencies` en pom padre — Criticidad: **CRÍTICA**
2. Implementar `eureka-server`: `@EnableEurekaServer`, `application.yml` con `register-with-eureka: false` — Criticidad: **CRÍTICA**
3. Implementar `api-gateway`: rutas a cada servicio por nombre Eureka, filtro global `JwtAuthenticationFilter` (valida JWT en cada request entrante) — Criticidad: **CRÍTICA**
4. Implementar `auth-service`: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`; JWT firmado HS256; tablas `users` + `roles` en PostgreSQL — Criticidad: **CRÍTICA**
5. `docker-compose.yml`: servicios `eureka`, `gateway`, `auth-service`, `postgres`, `mongodb`, `redis` con healthchecks y `depends_on` correctos — Criticidad: **CRÍTICA**
6. GitHub Actions: job `build-and-test` (`mvn verify`) en push a `main` y PRs — Criticidad: Normal

### Verificación
- [ ] `docker-compose up` levanta todos los servicios; Eureka dashboard en `http://localhost:8761` muestra `GATEWAY` y `AUTH-SERVICE` registrados
- [ ] `POST http://localhost:8080/auth/register` + `POST /auth/login` devuelven JWT válido a través del gateway
- [ ] Request sin JWT a ruta protegida devuelve `401` desde el filtro del gateway (no llega al servicio)
- [ ] Healthchecks de PostgreSQL, MongoDB y Redis en verde (`docker-compose ps`)

### Dependencias
- Requiere: —
- Bloquea: Todas las fases siguientes

### Guardado
- Commit: `"feat: eureka-server, api-gateway con JWT filter, auth-service, docker-compose base"`
- Estado: Servicios de infraestructura compilados y funcionales en Docker

---

## Fase 2: User Service y Forum Service

### Contexto
Los dos servicios de dominio social. `user-service` gestiona la identidad extendida del usuario; `forum-service` gestiona el contenido generado. Se comunican vía Feign para enriquecer posts con datos de perfil.

### Tareas
1. `user-service`: entidades JPA `Profile`, `Follow`, `Badge` en PostgreSQL; endpoints `GET/PUT /users/{id}`, `POST /users/{id}/follow`, `GET /users/{id}/feed` — Criticidad: **CRÍTICA**
2. `user-service`: lógica de asignación automática de badges por hitos (primer mazo, 10 seguidores); `GET /users/{id}/badges` — Criticidad: Normal (paralelizable)
3. `forum-service`: documentos MongoDB `Post`, `Comment`, `Thread`; CRUD `/forums`, `/forums/{id}/posts`, `/posts/{id}/comments` con paginación cursor-based — Criticidad: **CRÍTICA**
4. `forum-service`: `@FeignClient` a `user-service` para enriquecer posts con `authorName` y `authorAvatar` — Criticidad: Normal
5. `notification-service`: suscripción a Redis Pub/Sub canal `notifications`; endpoint SSE `GET /notifications/stream` para el frontend — Criticidad: Normal (paralelizable)
6. Componentes React: `ProfilePage`, `FollowButton`, `ForumThread`, `CommentList` con Redux slices; llamadas a través del gateway — Criticidad: Normal

### Verificación
- [ ] Eureka dashboard muestra `USER-SERVICE`, `FORUM-SERVICE`, `NOTIFICATION-SERVICE` registrados
- [ ] Flujo completo: crear perfil → seguir usuario → publicar post → recibir notificación SSE en frontend
- [ ] Feign entre `forum-service` y `user-service` resuelve por nombre Eureka (no por IP hardcodeada)
- [ ] Paginación de foros funciona sin N+1 queries (verificar con logs de query MongoDB)

### Dependencias
- Requiere: Fase 1 (Eureka, Gateway, JWT)
- Bloquea: Fase 3 (deck-service necesita user-service para ownership de mazos)

### Guardado
- Commit: `"feat: user-service, forum-service, notification-service SSE, Feign inter-service"`
- Estado: Flujo social end-to-end funcional a través del gateway, tests de integración verdes

---

## Fase 3: Deck Service con Integración Scryfall

### Contexto
Núcleo analítico de la plataforma. Combina MongoDB para persistencia de mazos, Redis para caché de cartas Scryfall y un motor de cálculo de stats.

### Tareas
1. `deck-service`: cliente `WebClient` (non-blocking) para Scryfall; caché Redis con TTL 24h para `/cards/search` y `/cards/{id}` — Criticidad: **CRÍTICA**
2. `deck-service`: documento MongoDB `Deck { ownerId, format, cards: [{scryfallId, qty}], stats, isPublic }`; CRUD `/decks` — Criticidad: **CRÍTICA**
3. `deck-service`: `DeckStatsCalculator`: curva de maná, distribución de tipos, distribución de colores; invocado en cada save — Criticidad: **CRÍTICA**
4. `deck-service`: algoritmo de sinergias por co-ocurrencia de keywords en Oracle text (implementar como `@Async` para no bloquear el save) — Criticidad: Normal
5. `deck-service`: endpoint `GET /decks/{id}/suggestions`; devuelve mock si `ai-service` no está disponible — Criticidad: Normal (paralelizable)
6. `deck-service`: `@FeignClient` a `user-service` para validar ownership y enriquecer respuestas — Criticidad: Normal
7. Componentes React: `DeckBuilder` (drag & drop), `ManaChart` (Recharts), `CardSearch`, `SynergyPanel` — Criticidad: Normal

### Verificación
- [ ] Segunda consulta a Scryfall (misma carta) se resuelve desde Redis en < 50ms (verificar con `redis-cli MONITOR`)
- [ ] Stats calculadas correctamente para un mazo Commander de 100 cartas
- [ ] `GET /decks/{id}` retorna datos de owner enriquecidos via Feign desde `user-service`
- [ ] Tests unitarios para `DeckStatsCalculator` con mazos de fixtures conocidos

### Dependencias
- Requiere: Fase 2 (user-service para ownership), Fase 1 (Redis, MongoDB, Gateway)
- Bloquea: Fase 4 (deck-service es el input del simulador y del módulo IA)

### Guardado
- Commit: `"feat: deck-service — Scryfall cache Redis, stats engine, sinergias async, UI DeckBuilder"`
- Estado: CRUD mazos funcional con stats, caché Scryfall activa, tests unitarios verdes

---

## Fase 4: Game Service (Simulador WebSocket STOMP) y AI Service

### Contexto
Los dos servicios más técnicamente exigentes. `game-service` gestiona estado de partida distribuido vía Redis y comunicación en tiempo real con WebSocket STOMP. `ai-service` es un proxy resiliente al modelo externo de la comunidad.

### Tareas
1. `game-service`: configurar STOMP sobre WebSocket en Spring Boot; topics `/topic/game.{roomId}` para broadcast, `/app/game.{roomId}.action` para recibir acciones de clientes — Criticidad: **CRÍTICA**
2. `game-service`: estado de partida como Redis Hash `game:{roomId}` con TTL de sesión: `{ hand, library, battlefield, graveyard, life, turn }` — Criticidad: **CRÍTICA**
3. `game-service`: lógica de turno MVP — acciones `SHUFFLE`, `DRAW`, `PLAY_CARD`, `TAP`, `MULLIGAN` (London Mulligan); sin stack de hechizos complejo en esta versión — Criticidad: **CRÍTICA**
4. `game-service`: room management: `POST /game/rooms` crea sala, `POST /game/rooms/{id}/join` une jugador; soporte hasta 4 jugadores (Commander) — Criticidad: Normal
5. `ai-service`: `POST /ai/recommend` — proxy al modelo IA externo con timeout 3s y fallback automático a co-ocurrencia de `deck-service` si falla — Criticidad: **CRÍTICA**
6. `ai-service`: `@FeignClient` a `deck-service` para obtener datos del mazo antes de llamar al modelo — Criticidad: Normal
7. Componentes React: `GameSimulator` (tablero con zonas SVG, drag & drop de cartas), `AIRecommendationsPanel` en `DeckBuilder` — Criticidad: Normal

### Verificación
- [ ] Simulación solitaria: `shuffle` → `draw 7` → `mulligan` → `play_card` funciona vía WebSocket STOMP sin errores
- [ ] Estado de partida persiste en Redis y se restaura correctamente tras reconexión WebSocket
- [ ] `POST /ai/recommend` devuelve resultado (real o fallback) en < 3s
- [ ] 4 clientes en la misma room reciben broadcast de acciones en < 200ms
- [ ] Tests de integración WebSocket con `StompClient` de Spring Test

### Dependencias
- Requiere: Fase 3 (deck-service para cargar mazo en partida), Fase 1 (Redis, WebSocket passthrough en Gateway)
- Bloquea: Fase 5 (evaluación con usuarios requiere simulador funcional)

### Guardado
- Commit: `"feat: game-service STOMP/Redis, ai-service proxy con fallback, componente GameSimulator"`
- Estado: Simulador funcional (solitario + multijugador 4p), IA con fallback, tests STOMP verdes

---

## Fase 5: Eventos, Seguridad, RGPD y Evaluación

### Contexto
Fase de cierre: funcionalidades de comunidad avanzadas, hardening de seguridad obligatorio, cumplimiento RGPD y validación con usuarios reales de la comunidad MTG hispanohablante.

### Tareas
1. `forum-service`: entidad MongoDB `Event` (torneo/draft); `POST /events`, inscripción de usuarios, publicación a `notification-service` al abrir plazas — Criticidad: Normal
2. `user-service`: `GET /users/leaderboard` — ranking de deck-builders por rendimiento estadístico de mazos públicos — Criticidad: Normal (paralelizable)
3. `user-service`: endpoints RGPD `GET /users/me/export` (portabilidad JSON) y `DELETE /users/me` (publica `UserDeletedEvent` en Redis Pub/Sub; cada servicio limpia sus datos) — Criticidad: **CRÍTICA**
4. `api-gateway`: filtro `RequestRateLimiter` con Redis token bucket (max 20 req/s por IP); cabeceras de seguridad HTTP (`X-Frame-Options`, `X-Content-Type-Options`) — Criticidad: **CRÍTICA**
5. Todos los servicios: validación de input con `@Valid` + Bean Validation; logs de auditoría en `auth-service` para intentos de login fallidos — Criticidad: **CRÍTICA**
6. `docker-compose.yml` perfil `prod`: variables externalizadas, únicamente gateway (`:8080`) y frontend (`:80`) exponen puertos al host — Criticidad: **CRÍTICA**
7. Pruebas de usabilidad: sesiones con 5–8 usuarios de la comunidad MTG hispanohablante, cuestionario SUS; resultados en `/docs/evaluacion-usabilidad.md` — Criticidad: Normal
8. Métricas de rendimiento: Lighthouse FE (target > 85), load test k6 contra gateway (100 req/s, p95 < 500ms) — Criticidad: Normal

### Verificación
- [ ] `docker-compose --profile prod up`: solo gateway y frontend exponen puertos; el resto son internos
- [ ] Rate limiting en gateway: > 20 req/s desde misma IP devuelve `429 Too Many Requests`
- [ ] `DELETE /users/me` elimina datos en PostgreSQL y MongoDB sin registros huérfanos
- [ ] Puntuación SUS promedio ≥ 70 en pruebas de usabilidad
- [ ] Load test k6: p95 < 500ms a 100 usuarios concurrentes contra gateway

### Dependencias
- Requiere: Fases 1–4 completadas
- Bloquea: —

### Guardado
- Commit: `"feat: eventos, RGPD, rate limiting gateway, seguridad prod, resultados evaluación"`
- Estado: Plataforma completa en producción, evaluación documentada, pipeline CI verde

---

## Matriz de Riesgos

| Riesgo | Ubicación | Impacto | Mitigación |
|--------|-----------|---------|------------|
| Race condition en arranque: servicios se registran en Eureka antes de que Gateway esté listo | Fase 1 | Alto | `depends_on` + `healthcheck` en docker-compose; retry automático con `spring.cloud.gateway.discovery.locator.enabled=true` |
| Feign falla si Eureka tarda en propagar registro de un servicio | Fases 2–4 | Medio | `@Retryable` en Feign clients; `eureka.client.registry-fetch-interval-seconds=5` |
| Módulo IA externo inestable o no disponible | Fase 4 | Alto | Fallback a co-ocurrencia de keywords en `deck-service`; timeout de 3s con `Resilience4j` |
| Rate limiting de Scryfall API (10 req/s) | Fase 3 | Medio | Caché Redis TTL 24h + `Resilience4j RateLimiter` en el `WebClient` |
| Estado WebSocket inconsistente en Commander 4 jugadores | Fase 4 | Alto | Redis Hash como única fuente de verdad; reconciliación completa al reconectar |
| Borrado RGPD con datos huérfanos entre PostgreSQL y MongoDB | Fase 5 | Medio | `UserDeletedEvent` en Redis Pub/Sub; cada servicio suscrito limpia su propia DB |
| Configuración duplicada entre microservicios | Fases 1–5 | Bajo | Variables comunes centralizadas en `docker-compose.override.yml`; considerar `spring-cloud-config` si crece |

---

## Checklist Final
- [ ] Fase 1: Eureka + Gateway + Auth completada y dockerizada
- [ ] Fase 2: User service + Forum service + Notification service completada
- [ ] Fase 3: Deck service + Scryfall + stats engine completada
- [ ] Fase 4: Game service STOMP + AI service proxy completada
- [ ] Fase 5: Eventos, RGPD, seguridad, evaluación completada
- [ ] Todos los servicios visibles en Eureka dashboard en entorno Docker
- [ ] Ningún servicio expone puerto directamente excepto a través del Gateway
- [ ] RGPD: export y delete funcionales y probados
- [ ] Springdoc OpenAPI activo en cada servicio (`/v3/api-docs`)
- [ ] GitHub Actions CI en verde en rama `main`
.