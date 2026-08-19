# Spec A — Backend (NestJS → Vercel Serverless)

**Agente responsable:** `backend`
**Depende de:** Spec D (Prisma generado y `DATABASE_URL`/`DIRECT_URL` definidas)
**Entrega para B:** query `groupDisputes(groupId)` (tarea A-5)

---

## A-1. Eliminar el módulo de suscripciones (graphql-ws)

**Archivos:**
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/subscriptions/` (carpeta completa: `subscriptions.module.ts`,
  `subscriptions.resolver.ts`, `guards/subscription-auth.guard.ts`)

**Cambios en `app.module.ts`:**
1. Quitar los imports (líns 20-21):
   ```diff
   - import { PubSubModule } from './modules/pubsub/pubsub.module'
   - import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module'
   ```
2. Quitar `PubSubModule` y `SubscriptionsModule` del array `imports` (líns 61-62).
3. En `GraphQLModule.forRoot`, **eliminar** el bloque `subscriptions: { 'graphql-ws': {...} }`
   (líns 33-56) y cambiar `autoSchemaFile` a `true` (generación en memoria, ya que el FS de la
   función es de solo lectura y no puede escribir `src/schema.gql`):
   ```diff
   - autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
   + autoSchemaFile: true,
   ```
   Mantener `sortSchema`, `introspection` y `context: ({ req, res }) => ({ req, res })`.

**Borrar** la carpeta `apps/api/src/modules/subscriptions/`.

---

## A-2. Eliminar la capa PubSub de los servicios

El `PubSubService` (in-memory/redis) ya no tiene suscriptores. Dos opciones:

- **Opción recomendada (limpia):** quitar todas las llamadas `this.pubSub.publish(...)` y el
  `private pubSub: PubSubService` de los constructores, más el `PubSubModule` de los módulos que lo
  importan. Luego borrar `apps/api/src/modules/pubsub/`.
- **Opción mínima (aceptable):** dejar `PubSubModule`/`PubSubService` pero convertir `publish()` en
  no-op. Menos cambios, pero deja código muerto.

**Archivos a editar (publicaciones a eliminar):**
- `apps/api/src/modules/groups/groups.service.ts`
- `apps/api/src/modules/performance/performance.service.ts`
- `apps/api/src/modules/invitations/invitations.service.ts`
- `apps/api/src/modules/exercises/exercises.service.ts`
- `apps/api/src/modules/disputes/disputes.service.ts`
- `apps/api/src/modules/disputes/processors/dispute-resolution.processor.ts`

Buscar con: `grep -rn "pubSub" apps/api/src --include=*.ts` y eliminar cada `this.pubSub.publish(...)`
y la inyección `private pubSub: PubSubService`. Quitar `PubSubModule` de los `imports` de los
`*.module.ts` correspondientes y el `import { PubSubModule } ...` / `import { PubSubService } ...`.

> Nota: con la Opción recomendada, el `ScheduleModule`/`@Cron` del `dispute-resolution.processor.ts`
> queda sin efecto en serverless (ver riesgo en Spec C). No borrar el procesador, pero su cron no
> disparará; se reemplaza por Vercel Cron.

---

## A-3. Handler serverless de Vercel (NestJS sobre ExpressAdapter)

**Nuevo archivo:** `api/graphql.ts` (raíz del repo → Vercel lo expone en `/api/graphql`).

```ts
// api/graphql.ts
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '../apps/api/src/app.module'
import express from 'express'

// Cachear la instancia entre invocaciones para reducir cold starts.
const expressApp = express()
let cachedApp: any

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    const adapter = new ExpressAdapter(expressApp)
    const app = await NestFactory.create(AppModule, adapter)
    const corsOrigin = (process.env.CORS_ORIGIN || '*')
      .split(',')
      .map((o) => o.trim())
    app.enableCors({ origin: corsOrigin, credentials: true })
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: false, transform: true }),
    )
    await app.init()
    cachedApp = app
  }
  // Delegar la request al servidor Express de Nest.
  expressApp(req, res)
}
```

**Notas:**
- No usar `app.listen()`. La función de Vercel recibe `(req, res)` y los pasa a Express.
- El `bodyParser` lo maneja Apollo/Express internamente; no es necesario configurarlo aquí.
- `apps/api/src/main.ts` **se mantiene intacto** para entornos con servidor tradicional (Fly/Render).
- `@vercel/node` compila TS y sigue los imports hacia `apps/api/src`, así que **no hace falta**
  correr `nest build` para que la función funcione (Prisma debe estar generado — ver Spec D/C).

---

## A-4. Variables de entorno que el backend consume

Definir en Vercel (Spec C) y en `.env` local:
- `DATABASE_URL` — pooler (pgbouncer) con `connection_limit=1`.
- `DIRECT_URL` — conexión directa (para `prisma migrate deploy`).
- `JWT_SECRET` — firma de JWT (auth).
- `CORS_ORIGIN` — lista separada por comas (`https://<web>,https://<mobile>`). En dev móvil Expo
  envía `origin: null`; el auth por token sigue cubriendo eso.
- `PEXELS_API_KEY`, `PIXABAY_API_KEY` (y `UNSPLASH_ACCESS_KEY` si aplica) — proveedores de imágenes.
- `NODE_ENV=production`.
- (Eliminar) `PUBSUB_ADAPTER`, `REDIS_*` — ya no se usan.

---

## A-5. Nueva query para disputas por grupo (para que B haga polling)

La suscripción `disputeEvent` era por `groupId`, pero `DISPUTES_QUERY` existe solo por `performanceId`.
Para que el cliente pueda hacer polling de disputas de un grupo, **crear**:

- Resolver en `apps/api/src/modules/disputes/disputes.resolver.ts`:
  ```ts
  @Query(() => [Dispute])
  async groupDisputes(@Args('groupId') groupId: string) {
    return this.disputesService.findByGroup(groupId)
  }
  ```
- Servicio `disputes.service.ts`: `findByGroup(groupId)` → `prisma.dispute.findMany({ where: { groupId }, include: {...} })`.
- Nueva constante en `apps/mobile/src/lib/graphql.ts`:
  ```ts
  export const GROUP_DISPUTES_QUERY = gql`
    query GroupDisputes($groupId: String!) {
      groupDisputes(groupId: $groupId) {
        id status reason createdAt expiresAt
        initiatedBy { id name }
        votes { id vote user { id name } }
        performance { id value reps weight exercise { id name } }
      }
    }
  `
  ```
- Exportar el tipo en el schema (ya existe `Dispute`).

> Esta query es la única adición requerida; el resto del polling usa queries ya existentes.

---

## A-6. Riesgos y límites del backend

| Riesgo | Mitigación |
|---|---|
| FS de solo lectura en Vercel | `autoSchemaFile: true` (no escribir `schema.gql`); no servir `uploads/` desde el FS. |
| Cold start Nest (~1-3s) | Cachear app en variable module-level (`cachedApp`). |
| Timeout Hobby 10s | Evitar migraciones en runtime; queries ligeras; el `groupDisputes` debe tener índices (`groupId,status`, `groupId,createdAt` ya existen). |
| Subida de imágenes a FS local | Mover a object storage (R2/S3) o deshabilitar el endpoint de upload en serverless. Fuera de alcance; marcar. |
| `@nestjs/schedule` no corre | Reemplazar por Vercel Cron (Spec C). |
| `graphql-subscriptions`/`ioredis` quedan como deps muertas | Opcional: eliminar del `package.json` de `apps/api` tras A-2. |

---

## A-7. Tests sugeridos (ver `05-tests.md`)
- Compilar `AppModule` sin `SubscriptionsModule` ni `PubSubModule`.
- `GET /graphql` (POST de una query existente) responde 200 sin WS.
- `groupDisputes(groupId)` devuelve las disputas del grupo.
