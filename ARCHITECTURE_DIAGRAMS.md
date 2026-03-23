# 📊 Diagrama de la Arquitectura de Microservicios

## Flujo General del Sistema

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENTES                                       │
├─────────────────┬──────────────────────────┬──────────────────┬────────────────┤
│   Web Browser   │      Mobile App          │   Desktop App    │    API Client  │
│  (localhost:    │   (React Native)         │   (Electron)     │   (Testing)    │
│    5173)        │   (http://localhost)     │                  │                │
└────────┬────────┴──────────────┬───────────┴──────┬───────────┴────────┬───────┘
         │                       │                  │                    │
         │    Solicitud HTTP     │                  │                    │
         └───────────────────────┴──────────────────┴────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   API GATEWAY          │
                    │   (Puerto 8080)        │
                    │  ┌──────────────────┐  │
                    │  │ Routing Rules    │  │
                    │  │ Load Balancer    │  │
                    │  │ Circuit Breaker  │  │
                    │  │ CORS Handling    │  │
                    │  └──────────────────┘  │
                    └──────┬────┬────┬───────┘
                           │    │    │
        ┌──────────────────┘    │    └──────────────────┐
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
    ┌─────────────┐      ┌──────────────┐      ┌──────────────┐
    │   AUTH      │      │    SEARCH    │      │     DECK     │
    │  SERVICE    │      │   SERVICE    │      │   SERVICE    │
    │             │      │              │      │              │
    │ Puerto 8081 │      │  Puerto 8082 │      │  Puerto 8083 │
    │             │      │              │      │              │
    │ ┌─────────┐ │      │ ┌──────────┐ │      │ ┌──────────┐ │
    │ │ Auth    │ │      │ │ Scryfall │ │      │ │ Deck     │ │
    │ │ Ctrl.   │ │      │ │ Service  │ │      │ │ Ctrl.    │ │
    │ │         │ │      │ │          │ │      │ │          │ │
    │ │ JWT     │ │      │ │ Proxy    │ │      │ │ CRUD     │ │
    │ │ Service │ │      │ │ API      │ │      │ │ Queries  │ │
    │ │         │ │      │ │          │ │      │ │          │ │
    │ └─────────┘ │      │ └──────────┘ │      │ └──────────┘ │
    │             │      │              │      │              │
    └──────┬──────┘      └──────┬───────┘      └───────┬──────┘
           │                    │                      │
           │         ┌──────────┴──────────┐           │
           │         │  External API      │           │
           │         │ api.scryfall.com   │           │
           │         │ (Network Request)  │           │
           │         └───────────────────┘            │
           │                                           │
           └──────────────────┬───────────────────────┘
                              │
                         ┌────▼────┐
                         │    DB   │
                         │         │
                         │PostgreSQL
                         │         │
                         │ - users │
                         │ - decks │
                         │ - cards │
                         └─────────┘
```

## Componentes de Descubrimiento y Coordinación

```
┌─────────────────────────────────────────────────────────────────┐
│                    EUREKA SERVER                                │
│                   (Puerto 8761)                                 │
│                                                                 │
│  Funciones:                                                     │
│  ├─ Registro de servicios                                       │
│  ├─ Health checks periódicos                                    │
│  ├─ Detección de fallos                                         │
│  ├─ Balanceo de carga inteligente (LB)                          │
│  └─ Dashboard web de monitoreo                                  │
│                                                                 │
│  Servicios Registrados:                                         │
│  ├─ auth-service:8081       ✓ ALIVE                            │
│  ├─ search-service:8082     ✓ ALIVE                            │
│  ├─ deck-service:8083       ✓ ALIVE                            │
│  └─ api-gateway:8080        ✓ ALIVE                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Matriz de Conectividad

```
┌──────────────────┬─────────────┬──────────────┬─────────────┬──────────────┐
│ From / To        │ Eureka      │ Gateway      │ Auth        │ Search       │
│                  │ (8761)      │ (8080)       │ (8081)      │ (8082)       │
├──────────────────┼─────────────┼──────────────┼─────────────┼──────────────┤
│ Clients          │ Opcional    │ REQUERIDO ✓  │ Indirecto   │ Indirecto    │
│                  │ (Dash)      │ (Siempre)    │ (vía Gate)  │ (vía Gate)   │
├──────────────────┼─────────────┼──────────────┼─────────────┼──────────────┤
│ Eureka Server    │ N/A         │ N/A          │ N/A         │ N/A          │
│                  │             │              │             │              │
├──────────────────┼─────────────┼──────────────┼─────────────┼──────────────┤
│ API Gateway      │ Registra +  │ N/A          │ Llama (LB)  │ Llama (LB)   │
│                  │ Consulta    │              │             │              │
├──────────────────┼─────────────┼──────────────┼─────────────┼──────────────┤
│ Auth Service     │ Registra    │ N/A          │ N/A         │ (opcional)   │
│                  │             │              │             │              │
├──────────────────┼─────────────┼──────────────┼─────────────┼──────────────┤
│ Search Service   │ Registra    │ N/A          │ (opcional)  │ N/A          │
│                  │             │              │             │              │
├──────────────────┼─────────────┼──────────────┼─────────────┼──────────────┤
│ PostgreSQL       │ -           │ -            │ Acceso BD   │ -            │
│                  │             │              │ (Usuarios)  │              │
└──────────────────┴─────────────┴──────────────┴─────────────┴──────────────┘
```

## Flujo de Autenticación

```
┌─────────────────┐
│  Usuario Final  │
│                 │
│ email: xxx      │
│ password: xxx   │
└────────┬────────┘
         │
         │ POST /api/auth/login
         │ (JSON)
         ▼
┌─────────────────────────────────────────────────┐
│         CLIENTE (Browser/Mobile)                │
│                                                 │
│  Envía credenciales al Gateway                  │
└────────────┬────────────────────────────────────┘
             │
             │ HTTP POST
             │
             ▼
┌─────────────────────────────────────────────────┐
│      API GATEWAY (8080)                         │
│                                                 │
│  Recibe en /api/auth/login                      │
│  Enruta a → auth-service:8081                   │
└────────────┬────────────────────────────────────┘
             │
             │ Internal Call
             │ (LB vía Eureka)
             │
             ▼
┌─────────────────────────────────────────────────┐
│      AUTH SERVICE (8081)                        │
│                                                 │
│  1. Recibe credenciales                         │
│  2. Consulta PostgreSQL (tabla users)           │
│  3. Valida password (BCrypt)                    │
│  4. Genera JWT Token (JwtService)               │
│  5. Retorna token al cliente                    │
└────────────┬────────────────────────────────────┘
             │
             │ Response JSON
             │ { token: "eyJ...", userId, ... }
             │
             ▼
┌─────────────────────────────────────────────────┐
│      CLIENTE (Browser/Mobile)                   │
│                                                 │
│  Recibe token                                   │
│  Lo guarda en localStorage/secureStorage        │
│                                                 │
│  Luego, para cada request:                      │
│  Authorization: Bearer {token}                  │
└─────────────────────────────────────────────────┘
```

## Ejemplo de Request Completo

```
═══════════════════════════════════════════════════════════════════

1. CLIENT (Browser)
   ├─ URL: http://localhost:5173
   ├─ Action: Search cards
   └─ Calls: GET http://localhost:8080/api/scryfall/search?q=lightning

2. API GATEWAY (8080)
   ├─ Receives: GET /api/scryfall/search?q=lightning
   ├─ Predicate Match: /api/scryfall/** → search-service
   ├─ Load Balancer: Consults Eureka for search-service instances
   ├─ Selected: search-service at http://localhost:8082
   └─ Forwards: GET http://localhost:8082/api/scryfall/search?q=lightning

3. SEARCH SERVICE (8082)
   ├─ Controller: ScryfallController
   ├─ Method: search(query, page)
   ├─ Service: ScryfallService
   │  ├─ Calls: RestClient to api.scryfall.com
   │  ├─ Query: https://api.scryfall.com/cards/search?q=lightning
   │  ├─ Response: { cards: [...], ... }
   │  └─ Maps to: CardDto
   └─ Returns: SearchResponseDto

4. API GATEWAY
   ├─ Receives response from search-service
   ├─ Status: 200 OK
   └─ Forwards to client unchanged

5. CLIENT
   ├─ Receives: { cards: [...], page: 1, ... }
   ├─ Renders: Card grid in React UI
   └─ User sees: Lightning cards displayed

═══════════════════════════════════════════════════════════════════
```

## Escalabilidad Horizontal

```
CON UNA SOLA INSTANCIA (Actual)
┌──────────────┐
│ auth-service │ :8081
└──────────────┘
       ▲
       │
    ┌──┴──┐
    │ LB? │ NO → Eureka solo tiene 1
    └─────┘

CON MÚLTIPLES INSTANCIAS (Escalado)
┌──────────────┐
│ auth-service │ :8081
└──────────────┘
       ▲
       │ LB ✓
    ┌──┴──────────┬─────────────┐
    │             │             │
┌───▼──────┐  ┌──▼─────┐  ┌───▼──────┐
│ Auth #1  │  │ Auth #2 │  │ Auth #3  │
│ :8081    │  │ :8081-2 │  │ :8081-3  │
└──────────┘  └─────────┘  └──────────┘

Todos registrados en Eureka ✓
Gateway distribuye requests automáticamente ✓
```

---

**Diagrama actualizado:** Marzo 23, 2026
**Versión:** 1.0 - Arquitectura de Microservicios Inicial
