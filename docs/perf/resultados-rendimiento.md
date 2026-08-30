# Resultados de rendimiento — k6 y Lighthouse

> Ejecución: **2026-08-25**. Alimenta el §4.3.4 de
> [`TFM_Cap4_Desarrollo_Practico.md`](../TFM_Cap4_Desarrollo_Practico.md) y las fichas
> RNF01 / RNF02 de la matriz de trazabilidad.
>
> Ficheros crudos en esta carpeta: `k6-summary.json`,
> `lighthouse-portada.report.{json,html}` (móvil),
> `lighthouse-portada-desktop.report.{json,html}` (escritorio).

---

## 1. Prueba de carga del *gateway* (k6) — RNF01

### 1.1. Condiciones de ejecución

El §4.3.4 exige declarar contra qué se mide y en qué máquina, porque los resultados no
son comparables entre sí. Se ejecutó **en local**, la opción que el propio capítulo llama
«aceptable y más reproducible».

| Parámetro | Valor |
|---|---|
| Objetivo | `http://localhost:11032` — `api-gateway` en Docker Desktop |
| Servicios levantados | `postgres`, `redis`, `eureka-server`, `api-gateway`, `auth-service` (los que el escenario ejercita) |
| Máquina | AMD Ryzen 9 5900X (12 núcleos / 24 hilos), 15,9 GB RAM, Windows 11 26200 |
| Herramienta | k6 v2.2.0 |
| Guion | `docs/load-test/gateway-load-test.js`, **sin modificar** |
| Escenario | `constant-arrival-rate`, 100 iteraciones/s, 1 min, `preAllocatedVUs` 100, `maxVUs` 200 |

> **No refleja latencia de red real.** Al ir por *loopback* no hay ni RTT ni TLS ni el
> proxy inverso de producción. Las cifras miden el coste de proceso del *gateway* y de
> `auth-service`, no la experiencia de un cliente remoto.

**Por qué no se midió contra producción.** El guion da de alta usuarios desechables. La
ejecución local creó **822 cuentas reales** en su base de datos (de ~6.000 intentos; el
resto los frenó el limitador). Contra `torresowo.myftp.org:7777` esas 822 cuentas basura
habrían quedado en la base de datos de producción.

### 1.2. Resultados

**Los dos umbrales del guion se cumplen.**

| Métrica | Objetivo | Resultado | |
|---|---|---|---|
| `http_req_duration` p95 | < 500 ms (RNF01) | **74,45 ms** | ✔ |
| `checks` (respuestas manejadas) | > 90 % | **100 %** (6.823/6.823) | ✔ |

**Distribución completa de latencias**

| | avg | mediana | p90 | **p95** | max |
|---|---|---|---|---|---|
| Todas las peticiones | 14,77 ms | 1,68 ms | 68,75 ms | **74,45 ms** | 229,17 ms |
| Solo respuestas 2xx | 73,50 ms | 69,47 ms | 82,54 ms | **88,74 ms** | 229,17 ms |

**Rendimiento sostenido**

| Métrica | Valor |
|---|---|
| Iteraciones completadas | 6.001 (99,68 it/s — el objetivo de 100/s se sostuvo) |
| Peticiones HTTP | 6.823 (113,33 req/s) |
| Datos recibidos / enviados | 2,7 MB / 1,6 MB |
| VUs necesarios | 20 de 100 preasignados |

### 1.3. Nota imprescindible sobre el «81,82 % de fallos»

k6 informa `http_req_failed: 81,82 %` (5.583 de 6.823). **No son errores.** Son
respuestas **429 Too Many Requests** emitidas deliberadamente por el `RequestRateLimiter`
del *gateway*, que limita a 20 req/s por IP; al proceder toda la carga de una sola
máquina, el limitador rechaza la mayor parte por diseño. k6 marca como «fallida» toda
respuesta que no sea 2xx, de ahí la cifra.

El propio guion lo anticipa en su cabecera y por eso sus `checks` aceptan 200, 409 y 429
como «manejadas»: **el 100 % de las peticiones recibió una respuesta correcta y a
tiempo**, y las 822 altas efectivas (≈ 13,7 registros/s) son coherentes con el límite
configurado.

> **Redacción sugerida para el TFM:** «tasa de error no gestionado: 0 %; el 81,8 % de
> respuestas no-2xx corresponde al limitador de peticiones actuando según lo diseñado, lo
> que verifica de paso RNF06». Publicar el 81,8 % como «tasa de error» sin esta
> explicación daría una impresión falsa de fallo.

**Lectura conservadora.** Si se considera que el p95 global (74 ms) está sesgado a la baja
por lo barato que es rechazar con un 429, la cifra honesta es el p95 **de las peticiones
que sí hicieron el trabajo completo**: **88,74 ms**, igualmente muy por debajo de los
500 ms exigidos.

---

## 2. Lighthouse en la portada — RNF02

### 2.1. Condiciones

| Parámetro | Valor |
|---|---|
| URL | `https://planeswalkerstower.web.app/` (despliegue real en Firebase Hosting) |
| Herramienta | Lighthouse 12.8.2 sobre Chrome headless |
| Fecha | 2026-08-25T12:27Z |

RNF02 no especifica factor de forma, y **Lighthouse puntúa de forma radicalmente distinta
en móvil y en escritorio**, así que se informan ambos.

### 2.2. Resultados

| Categoría | Objetivo | Escritorio | Móvil (por defecto) |
|---|---|---|---|
| **Performance** | > 85 (RNF02) | **96** ✔ | **49** ✘ |
| **Accessibility** | > 90 | **100** ✔ | **100** ✔ |
| Best Practices | — | 100 | 100 |
| SEO | — | 91 | 91 |

**Métricas de carga**

| Métrica | Escritorio | Móvil |
|---|---|---|
| First Contentful Paint | 0,9 s | 5,6 s |
| Largest Contentful Paint | 1,2 s | 7,6 s |
| Total Blocking Time | 30 ms | 490 ms |
| Cumulative Layout Shift | 0,014 | 0 |
| Speed Index | 0,9 s | 5,7 s |

### 2.3. Interpretación

- **RNF02 se cumple en escritorio (96) y no se cumple en móvil (49).** Hay que declararlo
  así; elegir solo la cifra favorable sería sesgar el resultado.
- **Accesibilidad 100 en ambos**, lo que confirma cuantitativamente el hallazgo cualitativo
  de la evaluación heurística (texto alternativo en el 100 % de las imágenes, contraste y
  etiquetado correctos). Es el mejor dato del conjunto.
- **La causa del 49 móvil está identificada:** la portada monta una escena 3D
  (`@react-three/fiber` + `three`), ya cargada de forma diferida
  ([`HomePage.tsx:8`](../../src/components/landing/CardScene.tsx)) pero que aun así deja el
  peso total de la página en **1.209 KiB**, con **238 KiB de JavaScript sin usar**, 1,1 s
  de ejecución de JS y 4,6 s de trabajo en el hilo principal. Con la CPU y la red
  emuladas de móvil de gama media, eso hunde FCP y LCP.

**Acción recomendada** (fuera del alcance de esta ejecución): retrasar el montaje de la
escena 3D hasta que la portada sea interactiva, o servir una imagen estática como *hero* en
viewports pequeños y reservar el 3D para escritorio. Es un cambio acotado que atacaría
simultáneamente FCP, LCP y TBT en móvil.

---

## 3. Reproducir estas medidas

```bash
# Carga (local). Requiere Docker Desktop en marcha.
cd backend
docker compose up -d postgres redis eureka-server api-gateway auth-service
cd ..
k6 run -e BASE_URL=http://localhost:11032 \
       --summary-export=docs/perf/k6-summary.json \
       docs/load-test/gateway-load-test.js
cd backend && docker compose down

# Lighthouse (contra el despliegue real)
npx lighthouse https://planeswalkerstower.web.app/ --preset=desktop \
    --only-categories=performance,accessibility,best-practices,seo \
    --output=json --output=html --output-path=docs/perf/lighthouse-portada-desktop
npx lighthouse https://planeswalkerstower.web.app/ \
    --only-categories=performance,accessibility,best-practices,seo \
    --output=json --output=html --output-path=docs/perf/lighthouse-portada
```
