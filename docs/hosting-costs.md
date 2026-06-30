# Coste de hosting — Planeswalkers Tower (Google Cloud)

> Cifras **aproximadas a principios de 2026**, en USD, precios on-demand salvo que se indique.
> Verifica siempre en el [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator).
> Región de referencia: `europe-west1` (precios similares en la mayoría de regiones).

## Qué hay que sostener
10 servicios Java (Spring Boot) + Postgres + MongoDB + Redis + frontend (nginx) + Caddy.
El factor de coste dominante es la **RAM**: cada JVM ocupa ~300–500 MB en reposo, así que ~4 GB
solo para los 10 servicios, más las 3 bases de datos. De ahí que la VM "cómoda" sea de 16 GB.

---

## Opción A — Una VM (recomendada)

### Precio de la VM (Compute Engine, e2)

| Máquina | vCPU / RAM | On-demand | Committed 1 año (~−37 %) | Committed 3 años (~−55 %) |
|---|---|---|---|---|
| e2-medium | 2* / 4 GB | ~$24 | ~$15 | ~$11 |
| **e2-standard-2** | 2 / 8 GB | **~$49** | **~$31** | ~$22 |
| **e2-standard-4** | 4 / 16 GB | **~$98** | **~$62** | ~$44 |
| e2-standard-8 | 8 / 32 GB | ~$196 | ~$123 | ~$88 |

\* vCPU compartida. *Nota: las E2 no tienen "sustained use discount", pero su precio base ya es bajo;
los descuentos por **uso comprometido** (CUD) sí aplican.*

- **4 GB (e2-medium):** solo viable si **consolidas servicios** y limitas heaps. Justo, sin margen.
- **8 GB (e2-standard-2):** funciona con tuning de heaps; suficiente para tráfico bajo.
- **16 GB (e2-standard-4):** cómodo, y permite **construir** las imágenes sin quedarse sin memoria.

### Costes accesorios (mensuales)

| Concepto | ~USD/mes |
|---|---|
| Disco 50 GB pd-balanced | ~$5 (pd-ssd: ~$8.5) |
| IP estática (en uso) | ~$3.7 |
| Egress a internet (tráfico bajo)¹ | ~$1–10 |
| Cloud DNS (1 zona) — *o Cloudflare gratis* | ~$0.5 |
| Snapshots/backups | ~$1–3 |
| Dominio `.com` (prorrateado) | ~$1 ($10–15/año) |

¹ Las **imágenes de cartas las sirve Scryfall directamente al navegador**, no tu servidor, así que
tu egress es básicamente HTML/JS/JSON → bajo.

### Totales realistas

| Escenario | Configuración | ~USD/mes |
|---|---|---|
| **Ajustado** | e2-standard-2 + CUD 1año + Cloudflare DNS | **~$45** |
| **Sin compromiso** | e2-standard-2 on-demand | ~$61 |
| **Cómodo** | e2-standard-4 + CUD 1año | **~$80** |
| **Cómodo sin compromiso** | e2-standard-4 on-demand | ~$116 |

➡️ **Rango práctico: ~$45–115/mes.** Y recuerda los **$300 de crédito / 90 días** de prueba de GCP:
cubren tus primeros ~2–3 meses gratis.

---

## Opción B — Gestionado / serverless (Cloud Run + datos gestionados)

Solo a título comparativo (no recomendada a esta escala):

| Componente | ~USD/mes |
|---|---|
| Memorystore Redis (1 GB, Basic) — siempre encendido | ~$35–50 |
| Cloud SQL Postgres (shared-core / pequeño) | ~$10–30 |
| MongoDB Atlas (M0 gratis ↔ M10 dedicado) | ~$0–57 |
| Cloud Run × ~10 servicios | scale-to-zero: pocos $ (pero cold-starts de JVM lentos) / siempre "calientes": ~$80–200+ |
| **Total** | **~$150–400+** |

Penaliza porque Redis y la BD están siempre encendidos, los **cold-starts de la JVM** dañan la UX,
y **Eureka** no encaja en el modelo de red de Cloud Run.

---

## Palanca de ahorro #1: consolidar microservicios

La app **no necesita 10 servicios**. Fusionando los de dominio (user/forum/deck/game/ai/
notification/search) en **2–3** y eliminando Eureka (en una sola VM basta con nombres de host de
Docker), pasas de ~10 JVMs a ~4. Eso te permite usar de forma fiable la **e2-standard-2 (8 GB) o
incluso e2-medium**, bajando el coste de cómputo a la franja **~$15–45/mes**.

## Comparativa rápida (fuera de GCP)
GCP no es lo más barato. Una VM equivalente en Hetzner (~€6–18), DigitalOcean o similar cuesta
aproximadamente la mitad. Si el criterio es solo precio, considéralo; si quieres quedarte en GCP,
la Opción A es lo sensato.

### 🆓 Gratis de verdad: Oracle Cloud Always Free
La capa *Always Free* de Oracle da **4 vCPU + 24 GB RAM ARM gratis para siempre** — suficiente para
el stack completo en una sola VM, a **0 €**. Es la mejor opción gratis para algo tan pesado.
Guía dedicada: **`DEPLOY_ORACLE.md`**. (El free tier de GCP, e2-micro 1 GB, NO cabe.)

---

## ¿Cubrirán los anuncios el coste? (AdSense)

Ingreso típico en este nicho: **~$1–5 por cada 1.000 páginas vistas (RPM)**. Para cubrir el hosting:

| Coste a cubrir | RPM $1 | RPM $2 | RPM $5 |
|---|---|---|---|
| $45/mes | ~45.000 PV/mes | ~22.500 PV/mes | ~9.000 PV/mes |
| $80/mes | ~80.000 PV/mes | ~40.000 PV/mes | ~16.000 PV/mes |

(PV = páginas vistas.) Para un sitio nuevo, decenas de miles de páginas vistas al mes es **mucho** al
principio: los anuncios cubrirán **una parte pequeña**, no el total, hasta tener tracción. Y recuerda
los avisos de marca/políticas (WotC Fan Content Policy, Scryfall) al monetizar — ver `DEPLOY.md`.

---

### TL;DR
- **~$45–115/mes** en una VM de GCP (menos con uso comprometido o consolidando servicios).
- Primeros 2–3 meses **gratis** con el crédito de prueba.
- La alternativa "serverless gestionada" cuesta **$150–400+** aquí: no compensa.
- Los **ads no cubren el coste** hasta tener bastante tráfico.
