# ⚡ Quick Start - MTG Deck Builder Microservicios

## 30 segundos para entender la transformación

✨ **Tu proyecto cambió de:**
- ❌ 1 monolito que hace todo (puerto 8080)

✨ **A:**
- ✅ 5 microservicios especializados
- ✅ Gateway central (sigue siendo puerto 8080)
- ✅ Eureka para descubrimiento de servicios
- ✅ Escalabilidad horizontal

---

## 🚀 Empezar en 2 minutos

### Opción A: Docker (Recomendado - más fácil)

```bash
cd backend
docker-compose -f docker-compose.microservices.yml up -d
```

**Listo!** Todos los servicios están corriendo.

Verifica en:
- Eureka: http://localhost:8761
- Gateway: http://localhost:8080/actuator/health

### Opción B: Con Maven (Desarrollo local)

Abre 6 terminales:

```bash
# Terminal 1
cd backend/eureka-server && mvn spring-boot:run

# Terminal 2 (espera 3 segundos después de Terminal 1)
cd backend/api-gateway && mvn spring-boot:run

# Terminal 3
cd backend/auth-service && mvn spring-boot:run

# Terminal 4
cd backend/search-service && mvn spring-boot:run

# Terminal 5
cd backend/deck-service && mvn spring-boot:run

# Terminal 6
npm run dev
```

---

## ✅ Verificación Rápida

Después de 30 segundos, verifica que todo funciona:

```bash
# 1. Eureka Dashboard (debe mostrar 4 servicios en VERDE)
curl http://localhost:8761/actuator/health

# 2. Buscar una carta (debe retornar JSON)
curl "http://localhost:8080/api/scryfall/search?q=lightning" | head -20

# 3. Registrar usuario (debe retornar token)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

---

## 📊 Estructura de 30.000 pies

```
WEB BROWSER (localhost:5173)
    ↓
    └──► API GATEWAY (localhost:8080) ◄── ÚNICA URL
           ├─ /api/auth/** ──► Auth Service (8081)
           ├─ /api/scryfall/** ──► Search Service (8082)
           └─ /api/decks/** ──► Deck Service (8083)
```

---

## 🎯 Los 5 Servicios

| Nombre | Puerto | Función | Ejemplo |
|--------|--------|---------|---------|
| **Eureka** | 8761 | Registro de servicios | http://localhost:8761 |
| **Gateway** | 8080 | Puerta única de entrada | http://localhost:8080 |
| **Auth** | 8081 | Login/Registro | POST /api/auth/login |
| **Search** | 8082 | Buscar cartas | GET /api/scryfall/search |
| **Deck** | 8083 | CRUD de decks | POST /api/decks |

---

## 🔐 Flujo de Autenticación (30 segundos)

1. Usuario escribe email y password
2. Browser envía a `http://localhost:8080/api/auth/login`
3. **Gateway** lo enruta a Auth Service (8081)
4. Auth Service genera **JWT token**
5. Browser guarda el token
6. Para requests futuras: `Authorization: Bearer {token}`

---

## 📚 Documentación (elige tu nivel)

### 👶 Principiante
→ Leer: `MICROSERVICES_README.md`

### 👨‍💻 Desarrollador
→ Leer: `ARCHITECTURE_MICROSERVICES.md`

### 🏗️ Arquitecto
→ Leer: `ARCHITECTURE_DIAGRAMS.md`

### ✅ Implementación
→ Usar: `IMPLEMENTATION_CHECKLIST.md`

---

## 🆘 Si algo no funciona...

### Los servicios no arrancan
```bash
# Revisar que PostgreSQL está corriendo
psql -U postgres -c "SELECT 1"

# Si no: instala PostgreSQL y crea la BD
createdb mtg_deck_builder
```

### Eureka no muestra servicios
```bash
# Espera 10 segundos después de iniciar Eureka
# Luego inicializa los demás servicios
```

### El Frontend no ve el API
```bash
# Asegurar que el Frontend está en puerto 5173
# Y el Gateway en puerto 8080
# No hay CORS porque ambos están en localhost
```

---

## 🎉 Siguiente: Completar la Implementación

Ya está la **infraestructura lista**. Ahora necesitas:

1. Copiar código de `ScryfallService` → search-service
2. Copiar código de `DeckController` → deck-service
3. Hacer testing

Ver: `IMPLEMENTATION_CHECKLIST.md` para los detalles.

---

## 🚀 Deploy en Producción

```bash
# 1. Build con Maven
mvn clean package -DskipTests

# 2. Build Docker images
docker-compose -f backend/docker-compose.microservices.yml build

# 3. Push a registry (Docker Hub, Azure, etc)
docker tag mtg-eureka-server:latest myregistry/mtg-eureka-server:v1.0.0
docker push myregistry/mtg-eureka-server:v1.0.0
# ... repite para cada servicio

# 4. Deploy a Kubernetes (próximo paso)
kubectl apply -f k8s/
```

---

## 💡 Tips Importantes

### ✅ DO
- Iniciar Eureka PRIMERO
- Esperar a que Eureka esté verde antes de otros servicios
- Usar el Gateway (puerto 8080) desde el frontend
- Usar variables de entorno para secrets (JWT_SECRET, DB_PASSWORD)

### ❌ DON'T
- Llamar directamente a microservicios (8081, 8082, 8083)
- Iniciar todos al mismo tiempo
- Hardcodear secrets en código
- Cambiar puertos sin actualizar application.yml

---

## 📞 URLs Importantes

**Durante desarrollo (localhost):**
```
Eureka Dashboard:     http://localhost:8761
API Gateway:          http://localhost:8080
Gateway Health:       http://localhost:8080/actuator/health
Frontend:             http://localhost:5173
```

**En producción:**
```
API Gateway:          https://api.example.com
Eureka Dashboard:     https://api.example.com/eureka (protegido)
```

---

## 🎓 Conceptos Clave Explicados

### Microservicios
Cada servicio = equipo independiente = puede escalar/deployar por separado

### Eureka (Service Registry)
Yellow Pages de servicios. "¿Dónde está Auth Service?" → "En localhost:8081"

### API Gateway
Recepcionista que dirige todas las llamadas al servicio correcto

### Circuit Breaker
Si un servicio falla, el gateway lo sabe y lo quita de la rotación

---

**Tiempo total de lectura: 5 minutos**
**Tiempo total de setup: 2 minutos**
**Status: LISTO PARA EMPEZAR ✅**

¡Felicidades por tener una arquitectura moderna! 🎉
