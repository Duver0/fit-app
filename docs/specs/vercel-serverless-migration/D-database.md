# Spec D — Database (Prisma en Serverless / Vercel)

**Agente responsable:** `database`
**Bloquea:** Spec C (env `DATABASE_URL`/`DIRECT_URL`) y Spec A (Prisma debe generarse en build).

---

## D-1. `binaryTargets` en `apps/api/prisma/schema.prisma`

El runtime de Vercel (AWS Lambda, Amazon Linux 2023) necesita el engine de Prisma para
`openssl-3.0`. Añadir `binaryTargets` al `generator`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

(dejar `datasource db` con `url = env("DATABASE_URL")` y `directUrl = env("DIRECT_URL")` como está).

---

## D-2. Generación del cliente en build

- Ya existe el script `prisma:generate` (`prisma generate`) en `apps/api/package.json`.
- El `buildCommand` de Vercel (Spec C-1) ya incluye:
  `npx prisma generate --schema apps/api/prisma/schema.prisma`.
- Confirmar que `@prisma/client` esté en `dependencies` (sí, línea 30 de `apps/api/package.json`).
- El engine generado (`.prisma/client` + binarios) se incluye en el bundle de la función vía
  `@vercel/node` (esbuild/nft rastrea `@prisma/client`).

---

## D-3. Connection pooling para serverless

En serverless, cada invocación puede abrir una conexión; sin pooler se agota el límite de la DB.
Usar el **pooler** (pgbouncer) de tu proveedor (Supabase/Neon/RDS Proxy) en `DATABASE_URL` y la
conexión directa en `DIRECT_URL`:

```
DATABASE_URL="postgresql://user:pass@<pooler-host>:6543/fitapp?pgbouncer=true&connection_limit=1&pool_timeout=20"
DIRECT_URL="postgresql://user:pass@<db-host>:5432/fitapp"
```

- `connection_limit=1` evita que una sola función acapare conexiones del pool.
- `DIRECT_URL` se usa solo en `prisma migrate deploy` (no en runtime).
- Si el proveedor no tiene pooler, considera `?connection_limit=1` y mantener la app cacheada
  (Spec A-3) para reusar el `PrismaClient` entre invocaciones (el `PrismaService` de Nest ya es
  singleton y se reusa mientras la instancia esté cacheada).

---

## D-4. Estrategia de migraciones (sin `start.sh` / sin servidor largo)

No hay proceso de larga duración que corra migraciones. Opciones (elegir una):

**Opción 1 — en el build de Vercel (ya configurada en Spec C-1):**
```
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```
Ventaja: despliegue atómico. Requisito: la DB debe ser alcanzable desde el entorno de build.

**Opción 2 — GitHub Action (recomendada como respaldo / para proveedores donde el build no
tiene acceso a la DB):**
```yaml
# .github/workflows/migrate.yml
on:
  push:
    branches: [main]
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npx prisma generate --schema apps/api/prisma/schema.prisma
      - run: npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
```
Con secret `DIRECT_URL` (no `DATABASE_URL`, para evitar el pooler en migraciones).

> No usar `prisma migrate dev` en producción. No correr migraciones dentro del handler en runtime
> (timeout de 10s y posibles corridas concurrentes).

---

## D-5. Índices relevantes para el polling

El polling golpea queries por `groupId`/`exerciseId`/`status`/`createdAt`. Verificar que existan
(ya presentes en `schema.prisma`):
- `PerformanceRecord`: `@@index([groupId, exerciseId(sort: Desc)])` ✓
- `Dispute`: `@@index([groupId, status])`, `@@index([groupId, createdAt])` ✓
- `GroupMember`: `@@index([groupId, isActive])` ✓
- `Exercise`: `@@index([groupId])` ✓

Si se añade `groupDisputes` (Spec A-5), los índices anteriores ya cubren el filtro por `groupId`.

---

## D-6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Engine de Prisma no coincide con el runtime | `binaryTargets: ["native","rhel-openssl-3.0.x"]` + `prisma generate` en build. |
| Agotamiento de conexiones | Pooler + `connection_limit=1` en `DATABASE_URL`. |
| Migración falla en build | Usar GitHub Action (Opción 2) con `DIRECT_URL`. |
| Cold start abre muchas conexiones | App cacheada en handler; reusa `PrismaClient` singleton. |

---

## D-7. Tests sugeridos (ver `05-tests.md`)
- `prisma validate` pasa con los `binaryTargets` nuevos.
- `prisma generate` produce cliente con el engine de `rhel-openssl-3.0.x`.
- `prisma migrate deploy` es idempotente (correr 2 veces no falla).
