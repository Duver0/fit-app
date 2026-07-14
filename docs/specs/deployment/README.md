# Despliegue de fit-app

## Descripción

Especificación completa para el despliegue en producción de **fit-app** con la siguiente topología:

| Componente | Tecnología | Destino |
|---|---|---|
| Frontend (SPA) | Expo / React Native Web | GitHub Pages |
| Backend API | NestJS + Prisma + GraphQL | Raspberry Pi 3 (ARMv7) |
| Base de datos | PostgreSQL 17 | Raspberry Pi (Docker) |
| Cache / Queue | Redis 7 + Bull | Raspberry Pi (Docker) |
| Reverse Proxy | Nginx | Raspberry Pi (Docker) |
| DNS Dinámico | DuckDNS | Raspberry Pi (servicio) |
| SSL/TLS | Let's Encrypt (certbot) | Raspberry Pi |

## Dominios

| Recurso | URL |
|---|---|
| Frontend (prod) | `https://duver0.github.io/fit-app/` |
| Backend API (prod) | `https://dbfitapp.duckdns.org` |
| GraphQL Playground | `https://dbfitapp.duckdns.org/graphql` |

## Dependencias externas

| Dependencia | Requerida | Notas |
|---|---|---|
| GitHub Pages | Sí | Frontend SPA |
| GitHub Container Registry (ghcr.io) | Sí | Imágenes Docker del backend |
| DuckDNS | Sí | DNS dinámico para el Pi |
| Let's Encrypt | Sí | SSL para el Pi |
| Cuenta GitHub (Duver0) | Sí | Repo + Actions + Pages + GHCR |

## Orden de implementación

```
Fase 1: Preparación del Frontend (CI/CD)
  1a. 01-frontend-build.md — Script build:web + 404.html + .env
  1b. 02-frontend-deploy.md — GitHub Action para deploy a Pages

Fase 2: Preparación del Backend (CI/CD)
  2a. 03-docker-multiarch.md — GitHub Action multi-arch para imagen ARM
  2b. 04-docker-compose.md — docker-compose.yml para Raspberry Pi

Fase 3: Configuración del Raspberry Pi
  3a. 05-raspberry-setup.md — Docker, DuckDNS, Nginx, Certbot
  3b. 06-env-config.md — Variables de entorno en producción

Fase 4: Despliegue Inicial
  4a. 07-initial-deploy.md — Primer deploy + migraciones + verificación

Fase 5: Post-Deploy
  5a. 08-post-deploy.md — Health checks, monitoreo, backups
```

## Notas generales

- **Raspberry Pi 3 (ARMv7)** tiene recursos limitados (1GB RAM, CPU quad-core ARM Cortex-A53). Las imágenes Docker deben ser multi-arch con soporte `linux/arm/v7`.
- El frontend se despliega en GitHub Pages **sin servidor propio** — es una SPA estática. El API_URL debe apuntar a `https://dbfitapp.duckdns.org/graphql`.
- No hay Auth0 en producción — la autenticación es JWT local con email/password y bcrypt.
- Los uploads (avatares) se almacenan en un volumen Docker en el Pi y Nginx los sirve.
- No hay CDN para assets estáticos — GitHub Pages sirve el frontend directamente.
