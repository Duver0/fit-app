# Migración a Vercel Serverless + Polling (Ruta B)

## Objetivo
Migrar el backend NestJS + GraphQL para que corra como **función serverless en Vercel (Hobby, sin tarjeta)**,
eliminando por completo WebSockets/graphql-ws, y sustituir el realtime del cliente móvil por **polling**
(`useQuery` con `pollInterval`). Conservar TODAS las queries/mutations existentes.

## Decisiones confirmadas (del repo)
- `apps/api/src/app.module.ts` importa `PubSubModule` (líns 20, 61) y `SubscriptionsModule` (líns 21, 62) y
  configura `subscriptions: { 'graphql-ws': {...} }` en `GraphQLModule` (líns 33-56).
- `apps/api/src/main.ts` usa `app.listen()` — NO sirve para serverless; se mantiene solo para dev/Fly/Render.
- `apps/mobile/src/lib/apollo.ts` usa `GraphQLWsLink` + `split` — debe quedar solo HTTP.
- Las suscripciones móviles (`use*Subscription`, `useRealtime`, `RealtimeProvider`) **no están montadas en
  ningún componente** (grep no encuentra usos fuera de sus propios archivos) → son código muerto y se eliminan.
- Queries equivalentes YA EXISTEN en `apps/mobile/src/lib/graphql.ts`:
  `RANKING_QUERY` (135), `MY_GROUPS_QUERY` (56), `GROUP_QUERY` (74), `EXERCISES_QUERY` (459),
  `MY_INVITATIONS_QUERY` (247), `MY_DISPUTES_QUERY` (425).
- `DISPUTES_QUERY` (395) es **por `performanceId`**, NO por `groupId`. Para replicar `disputeEvent` por grupo
  hace falta una query nueva `groupDisputes(groupId)` (ver Spec Backend, tarea B-5).
- Imágenes: proveedores usan `PEXELS_API_KEY`, `PIXABAY_API_KEY` (y Unsplash) → secrets de imagen.

## Dependencias externas
- Vercel: sí (Hobby, serverless functions, NO WebSockets).
- Redis: NO (se elimina PubSub; no se requiere Redis en Vercel).
- DB: PostgreSQL externa (Supabase/Neon/RDS) con pooler para serverless.

## Orden de implementación y dependencias
1. **D – Database** (Prisma serverless): `binaryTargets`, generate en build, pooling, migraciones.
   - *Bloquea:* C (necesita conocer DATABASE_URL/DIRECT_URL) y A (el handler depende de Prisma ya generado en build).
2. **A – Backend** (NestJS → Vercel): quitar subscriptions, handler serverless, `autoSchemaFile: true`.
   - *Depende de:* D.
   - *Entrega:* `groupDisputes(groupId)` para que B pueda hacer polling de disputas por grupo.
3. **C – DevOps** (Vercel): `vercel.json`, build command, env vars, rewrite a `/graphql`.
   - *Depende de:* A (ruta del handler `api/graphql.ts`) y D (env de DB).
4. **B – Mobile** (polling): `apollo.ts` HTTP-only, `pollInterval` en hooks de datos, borrar archivos de suscripción.
   - *Depende de:* A para `groupDisputes` (solo si se implementa el polling de disputas por grupo; el resto
     usa queries ya existentes y es independiente).
5. **Tests** (05-tests): validar que no quedan suscripciones y que el polling actualiza la UI.

## Archivos de spec (en esta carpeta)
- `README.md` — este archivo.
- `A-backend.md` — NestJS → Vercel serverless + eliminación de subscriptions.
- `B-mobile.md` — polling en cliente móvil.
- `C-devops.md` — configuración Vercel.
- `D-database.md` — Prisma serverless.
- `TASKS.md` — tareas atómicas por agente con dependencias.

## Notas / riesgos transversales
- **Cold starts (~1-3s)**: cachear la app Nest en `globalThis` entre invocaciones.
- **Timeout Hobby = 10s** (`maxDuration: 10`): queries pesadas o migraciones en build deben caber.
- **Uploads de archivos**: `main.ts` sirve `uploads/` desde el FS local. En serverless el FS es efímero/RO →
  el endpoint de subida de imágenes debe moverse a object storage (R2/S3) o deshabilitarse. Fuera de alcance
  de esta iteración; marcado como riesgo en A y C.
- **`@nestjs/schedule` (cron de disputas cada hora)**: no corre en serverless. Migrar a Vercel Cron que llame
  a un endpoint protegido, o a un job externo (GitHub Action). Marcado como riesgo/tarea pendiente en C.
