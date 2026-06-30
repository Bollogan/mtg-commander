# Despliegue de Planeswalkers Tower en una VM de Google Cloud

Guía paso a paso para hostear el stack completo (frontend + gateway + 8 microservicios +
Postgres + MongoDB + Redis) en **una sola VM de Compute Engine**, con HTTPS automático para
**planeswalkerstower.com** vía Caddy.

> Arquitectura: Internet → **Caddy** (TLS, :443) → **frontend** (nginx: SPA + proxy de `/api` y
> `/ws`) → **api-gateway** → microservicios. Solo Caddy se expone a internet.

---

## 0. Requisitos previos

- Una cuenta de Google Cloud con facturación activa (los primeros **$300 / 90 días** son gratis).
- El dominio **planeswalkerstower.com** registrado (Cloudflare Registrar, Porkbun, Namecheap…).
  GCP ya no vende dominios.
- `gcloud` CLI instalado en tu equipo (o usa la consola web).

---

## 1. Crear la VM

```bash
gcloud compute instances create planeswalkers-tower \
  --zone=europe-west1-b \
  --machine-type=e2-standard-4 \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=50GB --boot-disk-type=pd-balanced \
  --tags=http-server,https-server
```

- `e2-standard-4` (4 vCPU, 16 GB) va holgado para 10 JVMs + 3 bases de datos **y** para
  construir las imágenes. Puedes probar `e2-standard-2` (8 GB) si tuneas los heaps, pero el
  primer `--build` puede quedarse sin memoria.
- Los tags `http-server` / `https-server` abren los puertos 80 y 443 en el firewall por defecto.

## 2. IP estática

Reserva la IP para que no cambie (en la consola: **VPC network → IP addresses →** promociona la
IP efímera de la VM a estática), o por CLI:

```bash
gcloud compute addresses create ptower-ip --region=europe-west1
# Asóciala a la VM si la creaste con IP efímera, o crea la VM con --address=ptower-ip
```

Apunta la IP resultante, p. ej. `34.78.x.x`.

## 3. DNS

En tu registrador/DNS, crea dos registros **A** apuntando a la IP de la VM:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `planeswalkerstower.com` (o `@`) | `34.78.x.x` |
| A | `www` | `34.78.x.x` |

Espera a que propague (`nslookup planeswalkerstower.com`). Caddy no podrá sacar el certificado
hasta que el DNS resuelva a esta VM.

## 4. Instalar Docker en la VM

```bash
gcloud compute ssh planeswalkers-tower --zone=europe-west1-b

# Ya dentro de la VM:
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit   # vuelve a entrar para aplicar el grupo docker
```

## 5. Traer el código

```bash
git clone <URL_DE_TU_REPO> planeswalkers-tower
cd planeswalkers-tower/backend
```

## 6. Configurar secretos

```bash
cp .env.example .env
nano .env
```

Rellena (genera valores fuertes con `openssl rand -base64 48`):

```ini
JWT_SECRET=<base64 aleatorio>
POSTGRES_PASSWORD=<algo seguro>
MONGO_PASSWORD=<algo seguro>
# Opcional, para Google login (mismo id en los dos):
GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
```

> Edita también el email en `backend/Caddyfile` si quieres recibir avisos de expiración del
> certificado. El dominio ya está puesto a planeswalkerstower.com.

## 7. Levantar todo (con HTTPS)

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml --profile prod up -d --build
```

La primera vez tarda bastante: compila las 10 imágenes Java. Sigue el progreso con:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml ps
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml logs -f caddy
```

Cuando Caddy diga `certificate obtained`, abre **https://planeswalkerstower.com**. 🎉

---

## Operación

**Actualizar a una nueva versión:**
```bash
git pull
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml --profile prod up -d --build
```

**Ver logs de un servicio:**
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml logs -f auth-service
```

**Parar / arrancar:**
```bash
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml --profile prod down
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml --profile prod up -d
```

**Backups (los datos viven en volúmenes Docker):**
```bash
docker run --rm -v backend_postgres_data:/data -v $PWD:/backup alpine \
  tar czf /backup/postgres-$(date +%F).tar.gz -C /data .
# repite para backend_mongodb_data y backend_redis_data
```

---

## Notas y avisos

- **Google login:** además de `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID`, añade
  `https://planeswalkerstower.com` a *Authorized JavaScript origins* en Google Cloud Console
  (OAuth client). Si cambias el client id hay que **reconstruir** el frontend (`--build`).
- **Rate limiting:** el gateway limita por IP. Detrás de Caddy+nginx ve la IP del proxy, así que
  hoy el cupo (20 req/s) es compartido. Suficiente para tráfico moderado; si necesitas por-usuario
  hay que cambiar `RateLimitConfig` para leer `X-Forwarded-For`.
- **Memoria:** si una VM pequeña se queda corta, limita los heaps añadiendo
  `JAVA_TOOL_OPTIONS: "-XX:MaxRAMPercentage=50"` (o `-Xmx256m`) al `environment` de los servicios
  Java, o reduce el número de servicios.
- **Coste:** ver `docs/hosting-costs.md` para el desglose por tamaño de VM.
- **Marca/legal:** "Planeswalker"/MTG son marcas de Wizards of the Coast. Revisa su *Fan Content
  Policy* antes de monetizar (ads). Datos de cartas vía Scryfall: respeta su atribución.
