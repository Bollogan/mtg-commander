# Guía de Pruebas — Plataforma Social MTG

Todo lo que conviene probar manualmente, fase por fase. Las pruebas unitarias ya pasan
en el build (`mvn test`, 28 verdes); aquí se cubre la **verificación viva** (Docker,
flujos end-to-end, seguridad y rendimiento) que no se ejecuta en CI.

> Convención: el frontend habla **solo** con el gateway en `http://localhost:8080`.
> Sustituye `$TOKEN` por el `accessToken` devuelto al hacer login.

---

## 🚀 Puesta en marcha completa (de cero a poder probar)

> **Para evaluadores externos.** Sigue estos pasos en orden; al terminar tendrás toda la
> plataforma corriendo en local y un token listo para las pruebas de las secciones siguientes.
> No necesitas conocer el código: todo se levanta con Docker.

### Paso 1 — Instalar lo necesario

| Herramienta | Versión mínima | Para qué | Comprobar |
|-------------|----------------|----------|-----------|
| **Docker Desktop** (incluye Docker Compose v2) | 24+ | Levantar TODO el backend e infraestructura | `docker --version` y `docker compose version` |
| **Git** | cualquiera | Obtener el proyecto | `git --version` |
| Node.js (opcional) | 20+ | Frontend en modo desarrollo | `node --version` |
| `jq` (opcional) | cualquiera | Extraer el token en la consola | `jq --version` |
| k6 / Lighthouse (opcional) | cualquiera | Pruebas de rendimiento (sección 7) | `k6 version` |

> En Windows usa **Git Bash** o **PowerShell**. Donde el comando cambia entre ambos, se
> indican las dos variantes. Docker Desktop debe estar **abierto y en ejecución**.

### Paso 2 — Obtener el proyecto y situarse en `backend/`

```bash
git clone <URL_DEL_REPOSITORIO> mtg-deck-builder
cd mtg-deck-builder/backend
```
*(Si ya tienes la carpeta, simplemente `cd` a `mtg-deck-builder/backend`.)*

### Paso 3 — Levantar TODA la plataforma con un comando

La primera vez compila las imágenes (puede tardar varios minutos):

```bash
docker compose --profile fase2 --profile fase3 --profile fase4 up -d --build
```

Esto arranca **infraestructura** (PostgreSQL, MongoDB, Redis), **Eureka**, **API Gateway**
y los **9 microservicios**. (`-d` = segundo plano; quita `-d` para ver logs en vivo.)

### Paso 4 — Esperar a que todo esté listo (~1–2 min)

```bash
docker compose ps
```
Espera a que los contenedores con healthcheck (`mtg-postgres`, `mtg-mongodb`, `mtg-redis`,
`mtg-eureka`) aparezcan como **healthy**. Luego abre el panel de Eureka:

👉 <http://localhost:8761> → deben figurar **todos** los servicios registrados
(`API-GATEWAY`, `AUTH-SERVICE`, `USER-SERVICE`, `FORUM-SERVICE`, `DECK-SERVICE`,
`GAME-SERVICE`, `AI-SERVICE`, `NOTIFICATION-SERVICE`).

> Si un servicio de dominio no aparece aún, espera 30 s y refresca: arrancan tras Eureka.

### Paso 5 — Smoke test: registrarse, hacer login y guardar el token

**Git Bash / Linux / macOS (con `jq`):**
```bash
BASE_URL=http://localhost:8080
curl -s -X POST $BASE_URL/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"eval@example.com","password":"Password123!","displayName":"Evaluador"}' > /dev/null

TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"eval@example.com","password":"Password123!"}' | jq -r .accessToken)

echo "Token: $TOKEN"
```

**PowerShell:**
```powershell
$BASE_URL = "http://localhost:8080"
Invoke-RestMethod -Method Post "$BASE_URL/api/auth/register" -ContentType "application/json" `
  -Body '{"email":"eval@example.com","password":"Password123!","displayName":"Evaluador"}'
$login = Invoke-RestMethod -Method Post "$BASE_URL/api/auth/login" -ContentType "application/json" `
  -Body '{"email":"eval@example.com","password":"Password123!"}'
$TOKEN = $login.accessToken
$TOKEN
```
✅ Si ves un token largo (`eyJ...`), el backend funciona de extremo a extremo.

### Paso 6 — (Opcional) Levantar el frontend

```bash
# desde la raíz del proyecto (no desde backend/)
cd ..
npm install
npm run dev      # abre http://localhost:5173
```
Regístrate/inicia sesión desde la web y navega: `/decks/build`, `/play`, `/forums`,
`/events`, `/account`.

### Paso 7 — Apagar al terminar

```bash
cd backend
docker compose --profile fase2 --profile fase3 --profile fase4 down      # detiene y elimina contenedores
# añade -v para borrar también los datos (volúmenes de Postgres/Mongo/Redis):
docker compose --profile fase2 --profile fase3 --profile fase4 down -v
```

> A partir de aquí, las secciones 1–9 detallan **qué** comprobar en cada fase. Si solo
> quieres una verificación rápida, los pasos 3–5 ya demuestran que la plataforma está viva.

---

## 0. Requisitos previos

- Docker Desktop + Docker Compose
- Java 17 y Maven (solo si compilas fuera de Docker)
- Node 20+ (solo para el frontend en modo dev)
- Opcional: [k6](https://k6.io/) y `lighthouse` (`npm i -g lighthouse`) para rendimiento
- Cliente HTTP: `curl`, Postman o similar

Compilación rápida de comprobación (sin Docker):

```bash
cd backend
mvn -f pom-parent.xml test        # 28 tests verdes, reactor 11/11
cd .. && npm install && npm run build   # frontend verde
```

---

## 1. Arranque con Docker (por fases)

Los servicios se activan con perfiles de Compose (desde `backend/`):

```bash
cd backend

# Fase 1 (infra base): postgres, mongo, redis, eureka, gateway, auth
docker compose up -d

# Fase 2 (social): + user, forum, notification
docker compose --profile fase2 up -d

# Fase 3 (mazos): + deck
docker compose --profile fase2 --profile fase3 up -d

# Fase 4 (juego/IA): + game, ai
docker compose --profile fase2 --profile fase3 --profile fase4 up -d

# Estado y salud
docker compose ps
```

✅ **Comprobar:** `docker compose ps` muestra los contenedores `healthy`
(postgres, mongodb, redis con healthcheck en verde).

---

## 2. Fase 1 — Eureka + Gateway + Auth

### 2.1 Eureka dashboard
Abre <http://localhost:8761> →
✅ aparecen `API-GATEWAY` y `AUTH-SERVICE` registrados (y el resto según el perfil activo).

### 2.2 Registro y login (a través del gateway)
```bash
# Registro
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","displayName":"Tester"}'

# Login → devuelve accessToken + refreshToken
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```
✅ Ambos devuelven un JWT válido.
Guarda el token: `TOKEN=<accessToken>`.

### 2.3 Protección JWT en el gateway
```bash
# Sin token → 401 (el filtro del gateway corta antes de llegar al servicio)
curl -i http://localhost:8080/api/users/me

# Con token → 200
curl -i http://localhost:8080/api/users/me -H "Authorization: Bearer $TOKEN" -X POST
```
✅ Sin token: `401`. Con token: `200`.

### 2.4 Refresh token
```bash
curl -s -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```
✅ Devuelve un nuevo par de tokens (rotación).

---

## 3. Fase 2 — User, Forum, Notification (SSE)

### 3.1 Perfil y seguidores
```bash
# Provisionar/ver mi perfil
curl -s -X POST http://localhost:8080/api/users/me -H "Authorization: Bearer $TOKEN"

# Seguir a otro usuario (regístralo antes y usa su id)
curl -s -X POST http://localhost:8080/api/users/<otherUserId>/follow -H "Authorization: Bearer $TOKEN"

# Mis seguidores / a quién sigo / leaderboard
curl -s http://localhost:8080/api/users/<id>/followers -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:8080/api/users/leaderboard?limit=10" -H "Authorization: Bearer $TOKEN"
```

### 3.2 Foros (paginación cursor-based)
```bash
# Crear hilo
curl -s -X POST http://localhost:8080/api/forums -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Mi hilo","description":"hola"}'

# Crear post en el hilo
curl -s -X POST http://localhost:8080/api/forums/<threadId>/posts -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Post","body":"contenido"}'

# Listar posts (cursor)
curl -s "http://localhost:8080/api/forums/<threadId>/posts?limit=20" -H "Authorization: Bearer $TOKEN"
```
✅ El post ya viene enriquecido con `authorName`/`authorAvatar` (Feign en escritura, sin N+1).

### 3.3 Notificaciones en tiempo real (SSE)
- En el frontend (ver §8): la campana 🔔 muestra nuevas notificaciones cuando alguien
  a quien sigues publica.
- Por consola (stream SSE con auth):
```bash
curl -N http://localhost:8080/api/notifications/stream -H "Authorization: Bearer $TOKEN"
```
✅ Al provocar un evento (un seguido publica un post) llega un mensaje `NEW_POST` por el stream.

**Flujo completo Fase 2:** crear perfil → seguir usuario → ese usuario publica → recibo notificación SSE.

---

## 4. Fase 3 — Deck Service (Scryfall + stats + sinergias)

### 4.1 Búsqueda de cartas (caché Redis)
```bash
# Primera llamada (va a Scryfall)
time curl -s "http://localhost:8080/api/decks/cards/search?q=goblin" -H "Authorization: Bearer $TOKEN"
# Segunda llamada idéntica (desde Redis, mucho más rápida)
time curl -s "http://localhost:8080/api/decks/cards/search?q=goblin" -H "Authorization: Bearer $TOKEN"
```
✅ La 2ª respuesta es notablemente más rápida.
Verificación de caché en Redis:
```bash
docker exec -it mtg-redis redis-cli KEYS "scryfall:*"
docker exec -it mtg-redis redis-cli MONITOR   # la 2ª búsqueda NO genera tráfico saliente a Scryfall
```

### 4.2 CRUD de mazos + stats
```bash
# Crear mazo (usa scryfallIds reales de la búsqueda anterior)
curl -s -X POST http://localhost:8080/api/decks -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{
    "name":"Mi Commander","format":"commander","visibility":"PUBLIC",
    "cards":[{"scryfallId":"<id1>","qty":1},{"scryfallId":"<id2>","qty":24}]
  }'

# Ver mazo (incluye stats calculadas + owner enriquecido vía Feign)
curl -s http://localhost:8080/api/decks/<deckId> -H "Authorization: Bearer $TOKEN"
```
✅ `stats` trae `manaCurve` (sin tierras), `typeDistribution`, `colorDistribution`, `averageCmc`.
✅ `ownerName` viene de user-service (Feign).
✅ Tras un par de segundos, `stats.synergies` se rellena (cálculo `@Async`).

### 4.3 Sugerencias (IA con fallback)
```bash
curl -s http://localhost:8080/api/decks/<deckId>/suggestions -H "Authorization: Bearer $TOKEN"
```
✅ Devuelve sugerencias con `source` = `mock`/`fallback` (ai-service externo desactivado por
defecto) o `ai`/`external` si lo activas.

---

## 5. Fase 4 — Game Service (WebSocket STOMP) + AI

### 5.1 Sala de juego (REST)
```bash
# Crear sala (te une como jugador). Devuelve roomId
curl -s -X POST http://localhost:8080/api/game/rooms -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"Mesa 1","maxPlayers":4}'

# Estado de la sala (restore tras reconexión)
curl -s http://localhost:8080/api/game/rooms/<roomId> -H "Authorization: Bearer $TOKEN"
```
✅ Estado persistido en Redis: `docker exec -it mtg-redis redis-cli HGETALL game:<roomId>`.

### 5.2 Simulación por WebSocket (mejor desde el frontend, §8)
En el frontend, ruta **/play** → crear partida → botones **Shuffle → Draw 7 → Mulligan →
Play card** (arrastra de la mano al campo) → **Tap** (clic en carta del campo).
✅ El tablero se actualiza en tiempo real vía STOMP (`/topic/game/{roomId}`).
✅ Con varios navegadores/usuarios en la misma sala, las acciones se difunden a todos.
✅ Recargar la página restaura el estado (GET de la sala).

### 5.3 Recomendaciones IA (timeout 3s + fallback)
```bash
curl -s -X POST http://localhost:8080/api/ai/recommend -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"deckId":"<deckId>","format":"commander","cardIds":[]}'
```
✅ Responde en < 3s con `source` = `fallback` (co-ocurrencia de deck-service) por defecto,
o `external` si activas `AI_EXTERNAL_ENABLED=true` con un endpoint válido.

---

## 6. Fase 5 — Eventos, RGPD, Seguridad, Producción

### 6.1 Eventos (torneo/draft)
```bash
# Crear evento
curl -s -X POST http://localhost:8080/api/events -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Draft semanal","format":"draft","capacity":8}'

# Listar / inscribirse
curl -s http://localhost:8080/api/events -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:8080/api/events/<eventId>/register -H "Authorization: Bearer $TOKEN"
```
✅ Los seguidores del organizador reciben una notificación `NEW_EVENT` (campana / SSE).
✅ Al llenarse el cupo, el estado pasa a `FULL` y nuevas inscripciones devuelven `409`.

### 6.2 RGPD — Exportación y borrado
```bash
# Portabilidad: descarga todos mis datos en JSON
curl -s http://localhost:8080/api/users/me/export -H "Authorization: Bearer $TOKEN"

# Derecho al olvido: borra mi cuenta y propaga la limpieza
curl -i -X DELETE http://localhost:8080/api/users/me -H "Authorization: Bearer $TOKEN"
```
✅ El export incluye perfil, follows, badges y mazos.
✅ Tras el DELETE (`204`), comprobar que **no quedan huérfanos**:
```bash
# Postgres: sin perfil ni follows del usuario
docker exec -it mtg-postgres psql -U postgres -d mtg_deck_builder -c \
  "SELECT count(*) FROM profiles WHERE id='<userId>';"
# Mongo: sin mazos ni posts del usuario
docker exec -it mtg-mongodb mongosh -u mongo -p mongo --authenticationDatabase admin \
  --eval 'db.getSiblingDB("mtg_deck").decks.countDocuments({ownerId:"<userId>"})'
```
✅ Ambos `0` (deck-service, forum-service y notification-service limpian al recibir `USER_DELETED`).
Desde el frontend: menú usuario → **Account & privacy** → *Export my data* / *Delete my account*.

### 6.3 Rate limiting del gateway (20 req/s por IP)
```bash
# Ráfaga: muchas peticiones rápidas desde la misma IP
for i in $(seq 1 60); do \
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"x"}'; done | sort | uniq -c
```
✅ Aparecen varios `429 Too Many Requests` al superar el ritmo permitido.

### 6.4 Cabeceras de seguridad
```bash
curl -sI http://localhost:8080/api/auth/login -X POST \
  -H "Content-Type: application/json" -d '{}' | grep -iE "x-frame-options|x-content-type-options|referrer-policy"
```
✅ Presentes: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.

### 6.5 Auditoría de logins fallidos
```bash
curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"MAL"}'
docker compose logs auth-service | grep AUDIT
```
✅ Línea `AUDIT ... LOGIN_FAILED email=... ip=... reason=BadCredentialsException`.

### 6.6 Perfil de producción (solo gateway + frontend exponen puertos)
```bash
cd backend
export JWT_SECRET=... POSTGRES_PASSWORD=... MONGO_PASSWORD=...
docker compose -f docker-compose.prod.yml --profile prod up -d
docker compose -f docker-compose.prod.yml ps
```
✅ Solo `api-gateway` (`:8080`) y `frontend` (`:80`) publican puertos al host; el resto
son internos en `mtg-net`.

---

## 7. Rendimiento (opcional, Fase 5)

### 7.1 Carga con k6 (objetivo p95 < 500 ms a 100 req/s)
```bash
k6 run docs/load-test/gateway-load-test.js
# o apuntando a otra URL:
k6 run -e BASE_URL=http://localhost:8080 docs/load-test/gateway-load-test.js
```
✅ Umbral `http_req_duration p(95) < 500ms`. (Algunos `429` son esperables por el rate limiter.)

### 7.2 Lighthouse (objetivo Performance > 85)
```bash
npx lighthouse http://localhost:80 --only-categories=performance --view
```

### 7.3 Usabilidad (SUS ≥ 70)
Seguir el protocolo de [docs/evaluacion-usabilidad.md](docs/evaluacion-usabilidad.md) con
5–8 usuarios y completar la tabla de resultados.

---

## 8. Frontend (modo dev)

```bash
npm install
npm run dev        # http://localhost:5173 (Vite)
```
Rutas clave: `/login`, `/decks/build` (constructor con drag&drop, ManaChart, sugerencias),
`/play` (simulador), `/forums`, `/events`, `/account` (RGPD).

> El frontend usa `VITE_API_BASE` (por defecto `http://localhost:8080`).

---

## 9. Documentación OpenAPI (Springdoc)

Cada microservicio publica su contrato OpenAPI y una UI Swagger en su propio puerto
(expuestos en el compose de desarrollo). Con la plataforma levantada (sección 🚀):

| Servicio | Swagger UI | OpenAPI JSON |
|----------|-----------|--------------|
| auth-service | <http://localhost:8081/swagger-ui.html> | <http://localhost:8081/v3/api-docs> |
| user-service | <http://localhost:8082/swagger-ui.html> | <http://localhost:8082/v3/api-docs> |
| forum-service | <http://localhost:8083/swagger-ui.html> | <http://localhost:8083/v3/api-docs> |
| deck-service | <http://localhost:8084/swagger-ui.html> | <http://localhost:8084/v3/api-docs> |
| game-service | <http://localhost:8085/swagger-ui.html> | <http://localhost:8085/v3/api-docs> |
| ai-service | <http://localhost:8086/swagger-ui.html> | <http://localhost:8086/v3/api-docs> |
| notification-service | <http://localhost:8087/swagger-ui.html> | <http://localhost:8087/v3/api-docs> |

✅ Cada URL `/v3/api-docs` devuelve el JSON OpenAPI con los endpoints del servicio.

---

## 10. Checklist final del plan

- [ ] Todos los servicios visibles en el dashboard de Eureka (Docker)
- [ ] Ningún servicio expone puerto salvo a través del gateway (perfil prod)
- [ ] RGPD: export y delete funcionales y sin huérfanos
- [ ] Rate limiting: `429` al superar 20 req/s
- [ ] Springdoc OpenAPI activo en cada servicio (`/v3/api-docs`) — ver §9
- [ ] GitHub Actions CI en verde en `main`
