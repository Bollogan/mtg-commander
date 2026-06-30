# Despliegue GRATIS en Oracle Cloud Always Free (ARM)

Hostea **Planeswalkers Tower** entero — sin coste — en una VM ARM Ampere A1 de la capa
*Always Free* de Oracle (hasta **4 vCPU + 24 GB de RAM gratis para siempre**), más que suficiente
para los 10 microservicios + Postgres + MongoDB + Redis + frontend + Caddy.

> Misma arquitectura que `DEPLOY.md` (Caddy → frontend → gateway → servicios). La diferencia son
> el proveedor, que es **ARM (arm64)**, y los **dos cortafuegos** de Oracle. El resto es idéntico.

## ✅ Compatibilidad ARM — sin cambios de código
Ya está verificado: todos los `Dockerfile` usan imágenes multi-arquitectura
(`maven:3.9-eclipse-temurin-17`, `eclipse-temurin:17-jre-alpine`) y ninguno fija `--platform`.
Postgres/Mongo/Redis/nginx/Caddy/Node también tienen arm64. **Construyendo en la propia VM ARM, las
imágenes salen arm64 nativas** y todo funciona igual. No toques nada del repo.

---

## 0. Genera tu clave SSH (en tu PC, una sola vez)

La clave SSH es lo que te deja entrar a la VM. Son **dos ficheros**: la **privada** (secreta, se
queda en tu PC) y la **pública** (`.pub`, la que pegas en Oracle). Oracle nunca te da una clave: la
generas tú.

En **Windows 11** abre **PowerShell** (Windows ya trae OpenSSH) y ejecuta:

```powershell
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"
```

- Pulsa **Enter** para aceptar la ruta por defecto `C:\Users\<tu-usuario>\.ssh\id_ed25519`.
- Puede pedirte una *passphrase* (opcional, recomendable).
- ⚠️ Si avisa de que el fichero **ya existe**, responde **`n`** y NO lo sobreescribas: ya tienes
  clave, reutilízala (salta directamente a "ver tu clave pública").

Se crean dos ficheros en `C:\Users\<tu-usuario>\.ssh\`:
- `id_ed25519` → **privada** (no la compartas ni la subas a ningún sitio, jamás).
- `id_ed25519.pub` → **pública** (esta es la que pegarás en Oracle).

**Ver / copiar tu clave pública:**

```powershell
Get-Content $HOME\.ssh\id_ed25519.pub                    # la muestra por pantalla
Get-Content $HOME\.ssh\id_ed25519.pub | Set-Clipboard    # …o la copia al portapapeles
```

Es **una sola línea** que empieza por `ssh-ed25519 AAAA…` y termina con tu email. Eso es lo que
pegarás en Oracle en el paso 1.

---

## 1. Cuenta y VM

1. Crea una cuenta en **cloud.oracle.com** (capa *Always Free*; pide tarjeta pero no cobra).
2. **Compute → Instances → Create instance**:
   - **Image:** Canonical **Ubuntu 22.04** (o Oracle Linux 9).
   - **Shape:** *Change shape* → **Ampere** → `VM.Standard.A1.Flex` → pon **4 OCPUs** y **24 GB**
     (entra entero en Always Free).
   - **Networking:** deja la opción por defecto **Create new virtual cloud network** y asegúrate de
     que **Assign a public IPv4 address = Yes**. Esto crea automáticamente tu VCN + subnet pública
     (luego, en el paso 2, le abrirás los puertos 80/443).
   - **Add SSH keys:** elige **Paste public keys** y pega la línea de tu `id_ed25519.pub` (la de la
     sección 0), o **Upload public key file** y selecciona ese fichero `.pub`. (Nunca subas la
     privada `id_ed25519`.)
   - Crea la instancia. Cuando termine, apunta su **Public IP address** (la verás en la página de
     la instancia).

> ⚠️ **"Out of host capacity":** la shape A1 gratis a veces no tiene hueco. Reintenta a otras horas,
> cambia de *Availability Domain* o de región Home (se elige al crear la cuenta). Es lo único
> realmente molesto de Oracle.

## 2. Abrir puertos — los DOS cortafuegos (causa #1 de "no carga")

Oracle bloquea el tráfico entrante en **dos sitios**. Hay que abrir 80 y 443 en **ambos** — si solo
haces uno, la web seguirá sin cargar (este es el error nº1 de los novatos con Oracle).

**a) Red de Oracle (VCN → Security List)** — desde la consola web:

Al crear la VM, Oracle te montó una **VCN** (red virtual) con una **subnet pública** y una *Security
List* que de fábrica solo deja pasar SSH (puerto 22). Le añades 80 y 443 así:

1. Menú **☰** (arriba a la izquierda) → **Networking → Virtual cloud networks**.
2. Entra en tu VCN (se llamará algo como `vcn-2026...`).
3. En el panel izquierdo **Resources** → **Subnets** → entra en la subnet **pública**.
4. En **Security Lists** → entra en **"Default Security List for vcn-…"**.
5. Pulsa **Add Ingress Rules** y crea **una regla por puerto** con estos valores:

   | Campo | Regla HTTP | Regla HTTPS |
   |---|---|---|
   | Stateless | desmarcado | desmarcado |
   | Source Type | CIDR | CIDR |
   | Source CIDR | `0.0.0.0/0` | `0.0.0.0/0` |
   | IP Protocol | TCP | TCP |
   | Source Port Range | *(vacío)* | *(vacío)* |
   | Destination Port Range | `80` | `443` |
   | Description | http | https |

   Puedes meter las dos de golpe con **+ Another Ingress Rule**. Pulsa **Add Ingress Rules** para
   guardar.

   > `0.0.0.0/0` = "desde cualquier IP de internet" (lo que quieres para una web pública). El
   > puerto 22 (SSH) ya viene abierto por defecto, no lo toques.

**b) Cortafuegos del sistema operativo** (dentro de la VM por SSH):

```bash
# Ubuntu (usa iptables por defecto en las imágenes de Oracle):
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save        # persiste tras reinicios

# Oracle Linux (usa firewalld):
# sudo firewall-cmd --permanent --add-port=80/tcp --add-port=443/tcp && sudo firewall-cmd --reload
```

## 3. IP estática + DNS

Por defecto la IP pública es **efímera** (cambia si paras/reinicias la VM). Conviértela en
**reservada** para que tu dominio no deje de apuntar:

1. Abre la página de tu instancia → **Resources → Attached VNICs** → entra en la VNIC.
2. **IPv4 Addresses** → en la fila de la IP, menú **⋮** → **Edit**.
3. En *Public IP type* elige **Reserved public IP** → **Reserve a new public IP address** → ponle un
   nombre → **Update**. (La IP no cambiará; apúntala.)

Luego, en tu **DNS** (el del registrador del dominio, o Cloudflare), crea dos registros **A**:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `planeswalkerstower.com` (o `@`) | tu IP reservada |
| A | `www` | tu IP reservada |

Comprueba que resuelve con `nslookup planeswalkerstower.com` antes de seguir (Caddy no sacará el
certificado hasta que el dominio apunte a esta VM).

## 4. Docker + código

```bash
ssh ubuntu@<IP_PUBLICA>

curl -fsSL https://get.docker.com | sudo sh      # funciona en arm64
sudo usermod -aG docker $USER && exit             # re-entra para aplicar el grupo
ssh ubuntu@<IP_PUBLICA>

git clone <URL_DE_TU_REPO> planeswalkers-tower
cd planeswalkers-tower/backend
cp .env.example .env && nano .env                 # rellena JWT_SECRET, *_PASSWORD, etc.
```

## 5. Levantar (con HTTPS)

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml --profile prod up -d --build
```

La primera build compila los 10 servicios Java **en ARM** dentro de la VM: tarda un rato (los
4 OCPU ayudan). Sigue Caddy hasta ver `certificate obtained`:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml logs -f caddy
```

Abre **https://planeswalkerstower.com**. 🎉 Coste: **0 €**.

---

## Notas
- **RAM de sobra:** 24 GB cubren el stack con holgura. Si algún día quisieras más margen, aplica los
  topes de heap que se mencionan en `DEPLOY.md`.
- **Operación, backups, Google login, AdSense, avisos de marca:** idénticos a `DEPLOY.md` y
  `docs/hosting-costs.md`.
- **Límites Always Free:** 4 OCPU/24 GB ARM + 200 GB de disco + ~10 TB/mes de tráfico, para siempre.
  Sobra para enseñar la app y bastante más.
