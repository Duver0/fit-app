# Despliegue de fit-app

## Descripción

Estado actual del despliegue en producción:

| Componente | Tecnología | Destino |
|---|---|---|
| Frontend (SPA) | Expo / React Native Web | GitHub Pages |
| Backend API | NestJS + Prisma + GraphQL | **Vercel Serverless** (migrado desde Render) |
| Base de datos | PostgreSQL 17 | Neon (externo, serverless pooler) |
| Cache / Queue | ~~Redis 7 + Bull~~ | Eliminado (Vercel no soporta WebSockets) |

## Dominios

| Recurso | URL |
|---|---|
| Frontend (prod) | `https://duver0.github.io/fit-app/` |
| Backend API (prod) | `https://fit-app-lake-gamma.vercel.app` |
| GraphQL | `https://fit-app-lake-gamma.vercel.app/graphql` |

## Historial de despliegue

1. **Render** (eliminado) — Backend en Free tier con facturación inesperada.
2. **Raspberry Pi** (planificado) — Self-hosted en `https://dbfitapp.duckdns.org`. Specs en `docs/specs/deployment/`.
3. **Vercel Serverless** (actual) — Backend como función serverless. Configuración en `vercel.json`.

## Dependencias externas

| Dependencia | Requerida | Notas |
|---|---|---|
| GitHub Pages | Sí | Frontend SPA |
| Vercel | Sí | Backend serverless (Hobby) |
| Neon | Sí | PostgreSQL externo con pooler |
| Cuenta GitHub (Duver0) | Sí | Repo + Actions + Pages |

## Specs de migración a Vercel

La documentación de la migración de Render → Vercel está en `docs/specs/vercel-serverless-migration/`:
