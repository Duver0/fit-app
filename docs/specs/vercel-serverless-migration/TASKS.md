# TASKS — Tareas atómicas por agente

Cada tarea es autónoma y ejecutable por el agente indicado. Las dependencias se marcan con `←`.

---

## AGENTE: database
- **D-1** Editar `apps/api/prisma/schema.prisma`: añadir `binaryTargets = ["native", "rhel-openssl-3.0.x"]` al `generator client`.
- **D-2** Confirmar que `prisma generate` corre en build (script ya existe; lo usa Spec C-1).
- **D-3** Documentar/comunicar los valores recomendados de `DATABASE_URL` (pooler, `connection_limit=1`) y `DIRECT_URL` para DevOps.
- **D-4** Definir estrategia de migración: asegurar que `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma` se ejecuta en build O crear `.github/workflows/migrate.yml` con `DIRECT_URL` secret.
- **D-5** Validar índices existentes para los filtros de polling (ya presentes; solo verificar).

## AGENTE: backend
- **A-1** Editar `apps/api/src/app.module.ts`: quitar imports y usos de `PubSubModule` y `SubscriptionsModule`; eliminar bloque `subscriptions: { 'graphql-ws': {...} }` del `GraphQLModule`; cambiar `autoSchemaFile` a `true`.
- **A-2** Eliminar `apps/api/src/modules/subscriptions/` (carpeta). Quitar `this.pubSub.publish(...)`, inyección `PubSubService` y `PubSubModule` de: `groups.service.ts`, `performance.service.ts`, `invitations.service.ts`, `exercises.service.ts`, `disputes.service.ts`, `dispute-resolution.processor.ts` (y sus `*.module.ts`). Borrar `apps/api/src/modules/pubsub/`.
- **A-3** Crear `api/graphql.ts` (handler serverless Vercel con `ExpressAdapter`, app cacheada, CORS, `ValidationPipe`, sin `app.listen()`).
- **A-5** Crear query `groupDisputes(groupId)` en `disputes.resolver.ts` + `disputes.service.findByGroup` + exportar `GROUP_DISPUTES_QUERY` en `apps/mobile/src/lib/graphql.ts` (este último lo puede tocar backend o coordinar con mobile).
- **A-6** Opcional: quitar `graphql-subscriptions`, `ioredis` de `apps/api/package.json` si quedaron muertos tras A-2.

## AGENTE: devops
- **C-1** Crear `vercel.json` en raíz (buildCommand con `prisma generate` + `prisma migrate deploy`, `functions.api/graphql.ts` con `maxDuration:10, memory:1024`, rewrite `/ → /api/graphql`).
- **C-2** Configurar env vars/secrets en Vercel: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY` (si aplica), `NODE_ENV=production`, `EXPO_PUBLIC_API_URL`.
- **C-3** Asegurar que el frontend (web) use `EXPO_PUBLIC_API_URL=https://<api>.vercel.app/graphql` y que su origen esté en `CORS_ORIGIN`.
- **C-4** (Pendiente/fuera de alcance) Decidir plan para uploads a FS y cron de disputas (ver Spec C-4).

## AGENTE: mobile
- **B-1** Reescribir `apps/mobile/src/lib/apollo.ts`: solo HTTP (quitar `graphql-ws`, `GraphQLWsLink`, `split`); default `API_URL` → dominio Vercel.
- **B-2** Añadir `pollInterval` a `useQuery` en: `useRanking.ts` (8000), `useGroups.ts` (15000), `useGroup.ts` (15000), `useExercises.ts` (15000), `useInvitations.ts` (10000). Crear `useGroupDisputes.ts` (10000) usando `GROUP_DISPUTES_QUERY` (de A-5) y (opcional) `useMyDisputes` con `MY_DISPUTES_QUERY` (10000).
- **B-3** Borrar archivos de suscripción muertos: `use*Subscription.ts` (6), `useRealtime.ts`, `components/RealtimeProvider.tsx`. Verificar con grep que no queden `useSubscription`/`RealtimeProvider`.
- **B-4** En `apps/mobile/src/lib/graphql.ts`: borrar definiciones `*_SUBSCRIPTION` y añadir `GROUP_DISPUTES_QUERY`.

---

## Dependencias (grafo)
```
D (database) ──┬──> A (backend) ──> C (devops: necesita handler api/graphql.ts)
               │       │
               │       └──> B (mobile): necesita GROUP_DISPUTES_QUERY de A-5 para disputas por grupo
               │                                   (el resto de B es independiente de A)
               └──> C (devops: necesita DATABASE_URL/DIRECT_URL de D)
```
- **B puede empezar en paralelo con A** para todo excepto el polling de disputas por grupo
  (espera `GROUP_DISPUTES_QUERY` de A-5).
- **C no puede hacer deploy hasta que A-3 exista** (ruta del handler) y D defina las env de DB.
- **A no puede hacer deploy útil hasta D** (Prisma generado y DB alcanzable).

## Orden sugerido de ejecución
1. D-1..D-4 (database)
2. A-1, A-2, A-3, A-5 (backend)
3. B-1, B-2 (salvo useGroupDisputes), B-3, B-4 (mobile) — en paralelo con A-5
4. C-1, C-2, C-3 (devops) — tras A-3 y D
5. Tests (05-tests) y verificación end-to-end.
