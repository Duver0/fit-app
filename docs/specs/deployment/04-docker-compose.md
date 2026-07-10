# Backend — Docker Compose para Raspberry Pi

## Objetivo

Crear el archivo `docker-compose.yml` que orqueste todos los servicios del backend en la Raspberry Pi: API, PostgreSQL, Redis, y Nginx.

## Dependencias

- `03-docker-multiarch.md` — la imagen `ghcr.io/duver0/fit-app-api:latest` debe existir
- Tener Docker Compose V2 instalado en el Pi (`docker compose`)

## Tareas

---

### Tarea 4.1: Crear `infra/docker-compose.yml` en el repo

**Qué**: Crear el archivo de composición con 4 servicios:
1. **postgres** — PostgreSQL 17 (imagen oficial con soporte ARM)
2. **redis** — Redis 7 (imagen oficial con soporte ARM)
3. **api** — NestJS (imagen multi-arch desde GHCR)
4. **nginx** — Nginx reverse proxy + SSL (imagen oficial ARM)

**Por qué**: Docker Compose simplifica la gestión de múltiples contenedores en el Pi.

**Archivos afectados**: `infra/docker-compose.yml` (nuevo), `infra/nginx/` (configuraciones de Nginx)

**Categoría**: **A** (agente devops)

**Contenido del archivo**:

```yaml
# infra/docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:17-alpine
    container_name: fit-postgres
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - fit-network

  redis:
    image: redis:7-alpine
    container_name: fit-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - fit-network

  api:
    image: ghcr.io/duver0/fit-app-api:latest
    container_name: fit-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      JWT_SECRET: ${JWT_SECRET}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      CORS_ORIGIN: https://duver0.github.io
      PORT: 4000
      UPLOAD_DIR: /app/uploads
      NODE_ENV: production
    volumes:
      - uploads:/app/uploads
    networks:
      - fit-network

  nginx:
    image: nginx:1.25-alpine
    container_name: fit-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - uploads:/app/uploads:ro
      - certbot_data:/var/www/certbot
    depends_on:
      - api
    networks:
      - fit-network

volumes:
  postgres_data:
  redis_data:
  uploads:
  certbot_data:

networks:
  fit-network:
    driver: bridge
```

---

### Tarea 4.2: Crear configuración de Nginx

**Qué**: Crear los archivos de configuración de Nginx como reverse proxy para la API y servidor de archivos estáticos (uploads).

**Archivos afectados**:

- `infra/nginx/nginx.conf`
- `infra/nginx/conf.d/fit-app.conf`
- `infra/nginx/conf.d/ssl.conf`

**Categoría**: **A** (agente devops)

**`infra/nginx/nginx.conf`**:

```nginx
user nginx;
worker_processes auto;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    include /etc/nginx/conf.d/*.conf;
}
```

**`infra/nginx/conf.d/fit-app.conf`**:

```nginx
# HTTP -> HTTPS redirect (solo en producción con SSL)
server {
    listen 80;
    server_name fitapp.duckdns.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fitapp.duckdns.org;

    # SSL (configurado por certbot)
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # Health check endpoint
    location /health {
        proxy_pass http://api:4000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # GraphQL endpoint
    location /graphql {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Uploads (archivos estáticos)
    location /uploads/ {
        alias /app/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Apollo Sandbox (GraphQL playground, opcional en prod)
    location / {
        proxy_pass http://api:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Nota**: Los certificados SSL se generan con certbot (ver `05-raspberry-setup.md`). Inicialmente, hasta tener SSL, se puede usar solo HTTP en puerto 80.

---

### Tarea 4.3: Script de utilidad para primeros pasos en el Pi

**Qué**: Crear `infra/scripts/setup-pi.sh` con los comandos de instalación inicial en la Raspberry Pi.

**Por qué**: Facilita la configuración inicial del Pi, documentando todos los pasos en un script ejecutable.

**Archivos afectados**: `infra/scripts/setup-pi.sh` (nuevo)

**Categoría**: **A** (agente devops)

**Contenido del archivo**:

```bash
#!/bin/bash
set -euo pipefail

echo "=== fit-app: Raspberry Pi Setup ==="

# 1. Actualizar sistema
echo "[1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar Docker
echo "[2/6] Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Instalar Docker Compose plugin
echo "[3/6] Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

# 4. Instalar Nginx (para certbot standalone inicial)
echo "[4/6] Installing Nginx..."
sudo apt install -y nginx

# 5. Instalar Certbot
echo "[5/6] Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# 6. DuckDNS update script
echo "[6/6] Setting up DuckDNS..."
sudo tee /usr/local/bin/duckdns-update.sh > /dev/null << 'DUCKSCRIPT'
#!/bin/bash
# DuckDNS update script — ejecutar cada 5 minutos vía cron
DOMAIN="${1:-fitapp}"
TOKEN="${2:-}"
if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <domain> <token>"
    echo "Or set DUCKDNS_TOKEN env var"
    exit 1
fi
curl -s "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=" > /dev/null
echo "DuckDNS updated: $(date)"
DUCKSCRIPT
sudo chmod +x /usr/local/bin/duckdns-update.sh

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Logout/login to apply Docker group: newgrp docker"
echo "  2. Configure DuckDNS token: sudo crontab -e"
echo "     Add: */5 * * * * /usr/local/bin/duckdns-update.sh fitapp YOUR_DUCKDNS_TOKEN"
echo "  3. Create .env file in /srv/fit-app/.env"
echo "  4. Run: docker compose up -d"
```

---

### Tarea 4.4: Crear `infra/Makefile` con comandos útiles

**Qué**: Crear un Makefile en `infra/` con comandos frecuentes para gestionar el despliegue.

**Por qué**: Simplifica operaciones diarias sin recordar comandos largos de Docker.

**Archivos afectados**: `infra/Makefile` (nuevo)

**Categoría**: **A** (agente devops)

**Contenido del archivo**:

```makefile
# infra/Makefile
.PHONY: up down restart logs ps pull migrate seed health

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

pull:
	docker compose pull

migrate:
	docker compose exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

seed:
	docker compose exec api npx prisma db seed --schema=apps/api/prisma/schema.prisma

health:
	curl -s http://localhost/health | jq .

backup:
	docker compose exec postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$$(date +%Y%m%d_%H%M%S).sql
```

---

## Criterios de Aceptación

- [ ] `infra/docker-compose.yml` levanta los 4 servicios sin errores
- [ ] Nginx sirve como reverse proxy para el API en puerto 443 (o 80 inicialmente)
- [ ] Los uploads se sirven correctamente desde Nginx
- [ ] PostgreSQL y Redis tienen health checks que previenen que la API arranque antes que ellos
- [ ] `docker compose pull` descarga la última imagen de GHCR
- [ ] Los scripts de utilidad (`setup-pi.sh`, `Makefile`) están listos
