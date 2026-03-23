# MTG Deck Builder – Copilot Instructions

## Architecture overview
- Monorepo with a Vite/React/TS frontend (root) and a Spring Boot backend in backend/.
- Frontend talks only to the backend API; backend proxies Scryfall (api.scryfall.com) and normalizes card data.
- Core API flow: UI → src/services/scryfallApi.ts → backend /api/scryfall/* → Scryfall.
- Deck state is client-only via Zustand in src/stores/deckStore.ts.
- Card model is aligned across layers: backend CardDto → frontend Card in src/types/cardType.ts; mapping helpers in src/utils/mapToCard.ts.

## Key endpoints and data mapping
- Backend endpoints (ScryfallController):
  - GET /api/scryfall/search?q=...
  - GET /api/scryfall/top-commanders?limit=...
  - GET /api/scryfall/cards/{id}
  - GET /api/scryfall/cards/{id}/related
- Backend ScryfallService maps Scryfall JSON into CardDto, including image_uris, legalities, related_uris, and prices.
- Frontend uses prices.usd (TCGplayer) and prices.eur (Cardmarket) for pricing display.

## Frontend patterns
- Data fetching uses @tanstack/react-query with QueryClient in src/main.tsx.
- Pages: src/pages/HomePage.tsx (search/top commanders), CardDetailPage.tsx (detail + related), DecksPage.tsx (placeholder).
- UI uses react-bootstrap components + custom styles in src/App.css.
- i18n strings live in src/i18n.ts (inline resources for en/es).

## Backend patterns
- Spring Boot RestClient for Scryfall calls in backend/src/main/java/com/mtg/deckbuilder/service/ScryfallService.java.
- Server runs on port 8080 (backend/src/main/resources/application.yml).

## Local workflows
- Frontend dev: npm run dev
- Frontend build: npm run build
- Frontend lint: npm run lint
- Backend dev (from backend/): mvn spring-boot:run

## Conventions to follow
- Keep Card fields aligned across backend CardDto and frontend Card interface when adding new data.
- Prefer updating src/services/scryfallApi.ts for any new API calls; keep backend as the only Scryfall integration.
- Use existing styling tokens and class names in src/App.css for new UI components.
