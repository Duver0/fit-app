# Deployment Checklist — Lista Maestra de Tareas

## Leyenda

| Símbolo | Significado |
|---|---|
| `[ ]` | Pendiente |
| `[A]` | Lo ejecuta un **agente** del proyecto |
| `[B]` | Lo ejecuta **manual** el usuario |
| `[A/B]` | Mixto — el agente prepara, el usuario ejecuta |

---

## Fase 1: Frontend (CI/CD)

| # | Tarea | Archivos | Cat | Estado |
|---|---|---|---|---|
| 1.1 | Agregar script `build:web` a `apps/mobile/package.json` | `apps/mobile/package.json` | A | `[ ]` |
| 1.2 | Crear `public/404.html` para SPA routing | `apps/mobile/public/404.html` | A | `[ ]` |
| 1.3 | Verificar build web con `expo export` | — | A | `[ ]` |
| 1.4 | Agregar `apps/mobile/.env` con `EXPO_PUBLIC_API_URL` | `apps/mobile/.env` | B | `[ ]` |
| 1.5 | Agregar `.env` y `dist/` al `.gitignore` | `apps/mobile/.gitignore` | A | `[ ]` |
| 1.6 | Verificar `"web.output": "single"` en `app.json` | `apps/mobile/app.json` | A | `[ ]` |
| 2.1 | Crear workflow `deploy-frontend.yml` | `.github/workflows/deploy-frontend.yml` | A | `[ ]` |
| 2.2 | Configurar variable `EXPO_PUBLIC_API_URL` en repo | GitHub UI → Settings → Variables | B | `[ ]` |
| 2.3 | Habilitar GitHub Pages (Source: GitHub Actions) | GitHub UI → Settings → Pages | B | `[ ]` |
| 2.4 | (Opcional) Workflow PR preview | `.github/workflows/deploy-frontend-preview.yml` | A | `[ ]` |

## Fase 2: Backend (CI/CD + Docker)

| # | Tarea | Archivos | Cat | Estado |
|---|---|---|---|---|
| 3.1 | Crear workflow `deploy-backend.yml` (multi-arch) | `.github/workflows/deploy-backend.yml` | A | `[ ]` |
| 3.2 | Verificar Dockerfile para monorepo + ARM | `apps/api/Dockerfile` | A | `[ ]` |
| 3.3 | Verificar tags de imagen Docker | — | A | `[ ]` |
| 3.4 | Configurar visibilidad pública del paquete GHCR | GitHub UI → Packages | B | `[ ]` |
| 4.1 | Crear `docker-compose.yml` (4 servicios) | `infra/docker-compose.yml` | A | `[ ]` |
| 4.2 | Crear configs de Nginx | `infra/nginx/nginx.conf`, `infra/nginx/conf.d/*.conf` | A | `[ ]` |
| 4.3 | Crear script `setup-pi.sh` | `infra/scripts/setup-pi.sh` | A | `[ ]` |
| 4.4 | Crear `Makefile` con comandos útiles | `infra/Makefile` | A | `[ ]` |

## Fase 3: Raspberry Pi

| # | Tarea | Archivos | Cat | Estado |
|---|---|---|---|---|
| 5.1 | Preparar Pi (OS, SSH, IP estática) | — | B | `[ ]` |
| 5.2 | Ejecutar `setup-pi.sh` (Docker, Compose, Certbot) | — | B | `[ ]` |
| 5.3 | Registrar DuckDNS + configurar cron | — | B | `[ ]` |
| 5.4 | Configurar port forwarding en router | — | B | `[ ]` |
| 5.5 | Generar SSL con Certbot por primera vez | — | B | `[ ]` |
| 5.6 | Configurar renovación automática SSL | — | B | `[ ]` |
| 5.7 | (Opcional) DuckDNS via Docker | `infra/docker-compose.yml` | A | `[ ]` |

## Fase 4: Variables de Entorno

| # | Tarea | Archivos | Cat | Estado |
|---|---|---|---|---|
| 6.1 | Crear `infra/.env.example` | `infra/.env.example` | A | `[ ]` |
| 6.2 | Agregar `.env` al `.gitignore` global | `.gitignore` | A | `[ ]` |
| 6.3 | Crear `/srv/fit-app/.env` en el Pi | — | B | `[ ]` |
| 6.4 | Verificar sin secretos hardcodeados en YAML | `infra/docker-compose.yml` | A | `[ ]` |

## Fase 5: Despliegue Inicial

| # | Tarea | Archivos | Cat | Estado |
|---|---|---|---|---|
| 7.1 | Sincronizar `infra/` al Pi (rsync/scp/git) | — | B | `[ ]` |
| 7.2 | Crear directorios en Pi (ssl, uploads, etc.) | — | B | `[ ]` |
| 7.3 | Ejecutar `docker compose up -d` | — | B | `[ ]` |
| 7.4 | Ejecutar migraciones Prisma | — | A/B | `[ ]` |
| 7.5 | (Opcional) Seed de datos | — | A/B | `[ ]` |
| 7.6 | Health check completo | — | B | `[ ]` |
| 7.7 | Verificar CORS | — | B | `[ ]` |

## Fase 6: Post-Deploy

| # | Tarea | Archivos | Cat | Estado |
|---|---|---|---|---|
| 8.1 | Crear endpoint `/health` en NestJS | `apps/api/src/health/` | A | `[ ]` |
| 8.2 | Configurar monitoreo externo (UptimeRobot) | — | B | `[ ]` |
| 8.3 | Backup automático de PostgreSQL | `infra/scripts/backup-db.sh` | A/B | `[ ]` |
| 8.4 | Script de restauración | `infra/scripts/restore-db.sh` | A | `[ ]` |
| 8.5 | Logs rotativos de Docker | `/etc/docker/daemon.json` | A/B | `[ ]` |
| 8.6 | Script de salud del sistema | `infra/scripts/system-health.sh` | A | `[ ]` |
| 8.7 | Procedimiento de actualización documentado | — | B | `[ ]` |
| 8.8 | (Opcional) Dashboard Netdata | `infra/docker-compose.yml` | A | `[ ]` |

---

## Resumen

| Categoría | Contadas | Completadas |
|---|---|---|
| **A** (agente) | 20 | 0 |
| **B** (manual) | 18 | 0 |
| **A/B** (mixto) | 3 | 0 |
| **Total** | 41 | 0 |
