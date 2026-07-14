# Raspberry Pi — Configuración del Servidor

## Objetivo

Configurar la Raspberry Pi 3 como servidor de producción del backend, incluyendo Docker, DuckDNS, Nginx SSL y scripts de mantenimiento.

## Dependencias

- `04-docker-compose.md` — los archivos de infraestructura deben existir en el repo
- Raspberry Pi 3 con Raspbian OS Lite (o similar) instalado y acceso SSH
- Cable de red o WiFi configurado con IP estática (o DHCP reservation en el router)
- Puerto 80 y 443 abiertos en el router (forwarding desde el router al Pi)

## Tareas

---

### Tarea 5.1: Preparar la Raspberry Pi (OS y conectividad)

**Qué**: Asegurar que la Raspberry Pi tenga:
1. Raspbian OS Lite (64-bit recomendado, aunque ARMv7 es 32-bit; usar 32-bit compatible)
2. SSH habilitado (ssh pi@<IP>)
3. IP estática (configurar en router o en `/etc/dhcpcd.conf`)
4. Acceso a internet

**Categoría**: **B** (manual — hardware y SO)

**Pasos**:
```bash
# Verificar sistema
uname -m
# Debe devolver: armv7l

# Configurar IP estática (ejemplo)
sudo nano /etc/dhcpcd.conf
# Agregar:
# interface eth0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8

# Verificar conectividad
ping google.com
```

---

### Tarea 5.2: Ejecutar script de setup inicial

**Qué**: Correr el script `infra/scripts/setup-pi.sh` (creado en Tarea 4.3) que instala Docker, Docker Compose, Certbot y DuckDNS.

**Categoría**: **B** (manual — ejecutar en el Pi)

**Pasos**:
```bash
# Copiar el script al Pi (desde máquina local)
scp infra/scripts/setup-pi.sh pi@192.168.1.100:/home/pi/

# Ejecutar en el Pi
ssh pi@192.168.1.100
chmod +x setup-pi.sh
./setup-pi.sh

# Cerrar sesión y volver a entrar para aplicar grupo Docker
exit
ssh pi@192.168.1.100
docker ps  # debe funcionar sin sudo
```

---

### Tarea 5.3: Configurar DuckDNS

**Qué**: Crear una cuenta en DuckDNS, registrar un subdominio (e.g., `dbfitapp.duckdns.org`), obtener el token, y configurar la actualización automática de IP cada 5 minutos.

**Por qué**: La IP pública del hogar puede cambiar. DuckDNS mantiene el DNS actualizado automáticamente.

**Categoría**: **B** (manual — crear cuenta y configurar)

**Pasos**:
1. Ir a https://duckdns.org e iniciar sesión con GitHub, Google, etc.
2. Registrar el subdominio `fitapp` (o el que prefieras)
3. Copiar el **token** de DuckDNS
4. Configurar el cron en el Pi:

```bash
# Configurar DuckDNS token
sudo crontab -e
# Agregar línea:
*/5 * * * * /usr/local/bin/duckdns-update.sh fitapp TU_TOKEN_DUCKDNS
```

**Verificación**:
```bash
# Probar actualización manual
/usr/local/bin/duckdns-update.sh fitapp TU_TOKEN_DUCKDNS
# Verificar DNS
nslookup dbfitapp.duckdns.org
# Debe devolver tu IP pública
```

---

### Tarea 5.4: Configurar puerto forwarding en el router

**Qué**: Abrir puertos 80 (HTTP) y 443 (HTTPS) en el router de casa hacia la IP local del Raspberry Pi.

**Por qué**: Sin estos puertos, el tráfico de internet no llega al servidor.

**Categoría**: **B** (manual — configuración del router)

**Pasos genéricos**:
1. Entrar al panel del router (usualmente `http://192.168.1.1`)
2. Buscar "Port Forwarding" o "Virtual Server"
3. Agregar reglas:
   - Puerto externo 80 → IP del Pi puerto 80 (TCP)
   - Puerto externo 443 → IP del Pi puerto 443 (TCP)
4. Guardar y aplicar

> **Recomendación**: Si el ISP bloquea puertos 80/443, considerar usar Cloudflare Tunnel o Tailscale Funnel como alternativa.

---

### Tarea 5.5: Configurar Nginx con SSL (Let's Encrypt) — PRIMERA VEZ

**Qué**: Obtener certificado SSL con Certbot para el subdominio DuckDNS.

**Por qué**: Sin SSL, el navegador bloquea requests desde GitHub Pages (HTTPS) a un backend HTTP (mixed content). Además, GraphQL envía JWT que deben ir cifrados.

**Categoría**: **B** (manual — generar certificado en el Pi)

**Pasos**:

```bash
# 1. Detener temporalmente Docker Compose si Nginx está corriendo
cd /srv/fit-app
docker compose stop nginx

# 2. Obtener certificado con certbot standalone
sudo certbot certonly --standalone \
  -d dbfitapp.duckdns.org \
  --non-interactive \
  --agree-tos \
  --email TU_EMAIL@example.com

# 3. Copiar certificados a la carpeta de Nginx
sudo mkdir -p /srv/fit-app/nginx/ssl
sudo cp /etc/letsencrypt/live/dbfitapp.duckdns.org/fullchain.pem /srv/fit-app/nginx/ssl/
sudo cp /etc/letsencrypt/live/dbfitapp.duckdns.org/privkey.pem /srv/fit-app/nginx/ssl/

# 4. Iniciar Docker Compose
docker compose up -d nginx
```

---

### Tarea 5.6: Configurar renovación automática de SSL

**Qué**: Configurar un cron job que renueve el certificado Let's Encrypt automáticamente cada 2 meses.

**Por qué**: Los certificados Let's Encrypt expiran cada 90 días. La renovación automática evita interrupciones.

**Categoría**: **B** (manual — configuración del Pi)

**Script de renovación** (`/usr/local/bin/renew-ssl.sh`):

```bash
#!/bin/bash
# /usr/local/bin/renew-ssl.sh

# Renovar certificado
sudo certbot renew --quiet --no-self-upgrade

# Copiar certificados renovados a Nginx
sudo cp /etc/letsencrypt/live/dbfitapp.duckdns.org/fullchain.pem /srv/fit-app/nginx/ssl/
sudo cp /etc/letsencrypt/live/dbfitapp.duckdns.org/privkey.pem /srv/fit-app/nginx/ssl/

# Recargar Nginx
cd /srv/fit-app && docker compose exec nginx nginx -s reload
```

```bash
sudo chmod +x /usr/local/bin/renew-ssl.sh

# Agregar a crontab
sudo crontab -e
# Ejecutar cada 2 meses al mediodía:
# 0 12 1 */2 * /usr/local/bin/renew-ssl.sh
```

---

### Tarea 5.7: Opcional — Script DuckDNS con Docker en vez de cron

**Qué**: Usar un contenedor Docker (e.g., `linuxserver/duckdns`) en vez de un cron script nativo para la actualización de DuckDNS.

**Por qué**: Mantener todo en Docker simplifica la gestión. Si el Pi se reinicia, el contenedor arranca automáticamente.

**Categoría**: **A** (agente devops — alternativa Docker)

**Agregar al `docker-compose.yml`**:

```yaml
services:
  # ... existing services ...
  duckdns:
    image: linuxserver/duckdns:latest
    container_name: fit-duckdns
    restart: unless-stopped
    environment:
      - SUBDOMAINS=fitapp
      - TOKEN=${DUCKDNS_TOKEN}
      - LOG_FILE=false
    networks:
      - fit-network
```

> **Nota**: Requiere agregar `DUCKDNS_TOKEN` al `.env` de producción.

---

## Criterios de Aceptación

- [ ] Raspberry Pi tiene Docker y Docker Compose instalados
- [ ] `docker compose up -d` levanta todos los servicios sin errores
- [ ] `dbfitapp.duckdns.org` resuelve a la IP pública del hogar
- [ ] Puerto 80 y 443 están abiertos desde internet
- [ ] Certificado SSL Let's Encrypt es válido (`curl -I https://dbfitapp.duckdns.org`)
- [ ] La renovación automática de SSL está configurada (sin caducidad esperada)
- [ ] DuckDNS se actualiza automáticamente cada 5 minutos
