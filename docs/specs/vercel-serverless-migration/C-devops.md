# Spec C — DevOps (Vercel Hobby, Serverless)

**Agente responsable:** `devops`
**Depende de:** Spec A (handler en `api/graphql.ts`) y Spec D (env de DB).

---

## C-1. `vercel.json` (raíz del repo)

```json
{
  "version": 2,
  "installCommand": "npm install",
  "buildCommand": "npx prisma generate --schema apps/api/prisma/schema.prisma && npx prisma migrate deploy --schema apps/api/prisma/schema.prisma",
  "functions": {
    "api/graphql.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/graphql" }
  ]
}
```

**Explicación:**
- `api/graphql.ts` es la función serverless (Spec A-3). Vercel la expone en `/api/graphql`.
- `rewrites` envía **cualquier** ruta a la función GraphQL, de modo que el endpoint queda en
  `https://<proyecto>.vercel.app/graphql` (coincide con el default que espera el móvil vía
  `EXPO_PUBLIC_API_URL`).
- `maxDuration: 10` (límite de Hobby). `memory: 1024` ayuda con el arranque de Prisma + Nest.
- `buildCommand` genera el cliente Prisma y aplica migraciones pendientes en el build
  (requiere que la DB sea alcanzable desde el entorno de build de Vercel).
- **No** se usa `nest build`; `@vercel/node` compila el TS del handler y sus imports.

> Alternativa si `prisma migrate deploy` en build falla (DB no accesible en build): correr las
> migraciones con un GitHub Action `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`
> usando el secret `DIRECT_URL`, en cada push a `main`.

---

## C-2. Variables de entorno y secrets (Vercel)

Configurar en **Project Settings → Environment Variables** (o `vercel env add`):

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@<pooler-host>:6543/db?pgbouncer=true&connection_limit=1` | Pooler (pgbouncer) para serverless. Ver Spec D. |
| `DIRECT_URL` | `postgresql://user:pass@<db-host>:5432/db` | Conexión directa para migraciones. |
| `JWT_SECRET` | `<secreto>` | Firma de JWT. |
| `CORS_ORIGIN` | `https://<web>,https://<otro>` | Separado por comas. Para Expo nativo el token basta. |
| `PEXELS_API_KEY` | `<key>` | Proveedor de imágenes. |
| `PIXABAY_API_KEY` | `<key>` | Proveedor de imágenes. |
| `UNSPLASH_ACCESS_KEY` | `<key>` (si aplica) | Proveedor de imágenes. |
| `NODE_ENV` | `production` | |
| `EXPO_PUBLIC_API_URL` | `https://<proyecto>.vercel.app/graphql` | Para el build del frontend (web). |

> En Hobby no se necesita tarjeta. No definir `PUBSUB_ADAPTER`/`REDIS_*` (ya no se usan).

---

## C-3. Frontend (Expo web / GitHub Pages)

- Si el web corre en **Vercel**: definir `EXPO_PUBLIC_API_URL` en ese proyecto apuntando a
  `https://<api-proyecto>.vercel.app/graphql` y añadir su origen a `CORS_ORIGIN` del backend.
- Si el web corre en **GitHub Pages**: setear `EXPO_PUBLIC_API_URL` en el workflow de build
  (`expo export` / `eas build --platform web`) con la misma URL de Vercel.
- El default en `apollo.ts` ya se cambia a la URL de Vercel (Spec B-1), pero la env var prevalece.

---

## C-4. Riesgos / tareas pendientes (fuera de alcance inmediato)

| Riesgo | Plan |
|---|---|
| **Uploads a FS local** (`main.ts` sirve `uploads/`): en serverless el FS es efímero/RO. | Mover subida de imágenes a object storage (R2/S3) y servir por URL firmada; o deshabilitar ese endpoint en la función. Tarea aparte. |
| **Cron de disputas** (`@nestjs/schedule` `@Cron(EVERY_HOUR)`): no corre en serverless. | Añadir a `vercel.json` un `crons: [{ "path": "/api/cron/disputes", "schedule": "0 * * * *" }]` que invoque un endpoint protegido (token de admin) que ejecute `dispute-resolution`; o mover la resolución a un GitHub Action horario. Requiere un endpoint HTTP nuevo en el backend. |
| **Cold start** Nest+Prisma (~1-3s). | App cacheada en el handler (Spec A-3). `memory: 1024` reduce frecuencia de cold starts. |
| **Prisma engine en el bundle**. | `binaryTargets: ["native","rhel-openssl-3.0.x"]` (Spec D) + `prisma generate` en build asegura el engine de Amazon Linux 2023. |

---

## C-5. Verificación post-deploy
- `curl -X POST https://<proyecto>.vercel.app/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}'` → debe responder `{"data":{"__typename":"Query"}}`.
- Confirmar que `/graphql` (sin `/api`) también redirige (rewrite).
- Revisar logs de build: `prisma generate` corrió sin error.

---

## C-6 (DevOps agent) — Suplemento: env vars, runbook y riesgos

> Añadido por el agente `devops` al crear `vercel.json`. JSON no admite comentarios, por eso
> esta documentación vive aquí. El `vercel.json` resultante:

```json
{
  "version": 2,
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npx prisma generate --schema=apps/api/prisma/schema.prisma",
  "functions": {
    "api/graphql.ts": {
      "maxDuration": 10,
      "memory": 1024,
      "includeFiles": [
        "apps/api/**",
        "packages/shared/**",
        "apps/api/prisma/**",
        "node_modules/.prisma/**",
        "node_modules/@prisma/client/**",
        "node_modules/@prisma/engines/**"
      ]
    }
  },
  "rewrites": [
    { "source": "/graphql", "destination": "/api/graphql" },
    { "source": "/(.*)", "destination": "/api/graphql" }
  ]
}
```

### C-6.1. Ajustes aplicados vs. la spec original
- **`buildCommand` no incluye `npm run api:build` (`nest build`)**. En serverless, `@vercel/node`
  compila el TS del handler y sus imports directamente (Spec A-3 / C-1 nota). `nest build` genera
  `dist/` pero el handler importa desde `src/`, así que es innecesario y se omitió.
- **`installCommand` separado** (`npm install --legacy-peer-deps`) para evitar doble instalación.
- Se usa **`functions`** (forma moderna) en lugar de `builds` (deprecado). `maxDuration: 10` y
  `memory: 1024` son los topes de **Hobby** (sin tarjeta).
- `includeFiles` asegura que el cliente Prisma, el schema y los engines lleguen al bundle de la
  función (Vercel tracea `node_modules`, pero los engines de Prisma a veces no se incluyen solos).

### C-6.2. Variables de entorno / secrets (Vercel dashboard o `vercel env add`)

**Secrets (sensitive):**
| Variable | Valor ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@<pooler-host>:6543/neondb?pgbouncer=true&connection_limit=1` | Pooler Neon (pgbouncer) para serverless. **`connection_limit=1` obligatorio** (Spec D). |
| `DIRECT_URL` | `postgresql://user:pass@<db-host>:5432/neondb` | Conexión directa de Neon, solo para `prisma migrate deploy`. |
| `JWT_SECRET` | `<secreto-largo>` | Firma de JWT. |
| `UNSPLASH_ACCESS_KEY` | `<key>` | Proveedor de imágenes (si aplica). |
| `PEXELS_API_KEY` | `<key>` | Proveedor de imágenes. |
| `PIXABAY_API_KEY` | `<key>` | Proveedor de imágenes. |

**No-secretos:**
| Variable | Valor | Notas |
|---|---|---|
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | `https://duver0.github.io` | Origen del web (GitHub Pages). Separar varios por comas. |
| `APP_URL` | `https://fit-app-api.vercel.app` | URL pública de la API (la da Vercel al crear el proyecto). |
| `UPLOAD_DIR` | `/tmp` | En serverless el FS es de solo lectura; `/tmp` es el único escribible (efímero). Ver riesgo C-6.4. |

> En Hobby no se necesita tarjeta. **No** definir `PUBSUB_ADAPTER` / `REDIS_*` (ya no se usan tras Spec A).

Comando rápido (repetir por cada variable):
```bash
vercel env add DATABASE_URL        # pega el valor cuando lo pida
vercel env add DIRECT_URL
vercel env add JWT_SECRET
vercel env add UNSPLASH_ACCESS_KEY
vercel env add PEXELS_API_KEY
vercel env add PIXABAY_API_KEY
vercel env add NODE_ENV production
vercel env add CORS_ORIGIN https://duver0.github.io
vercel env add APP_URL https://fit-app-api.vercel.app
vercel env add UPLOAD_DIR /tmp
# --- Object storage para uploads (RESUELVE el FS de solo lectura) ---
vercel env add STORAGE_DRIVER s3
vercel env add S3_BUCKET fit-app-uploads
vercel env add S3_ACCOUNT_ID <tu-account-id-r2>      # solo para R2; omitir si usás Supabase/MinIO
vercel env add S3_ENDPOINT https://<account>.r2.cloudflarestorage.com
vercel env add S3_REGION auto
vercel env add S3_ACCESS_KEY_ID <r2-access-key>
vercel env add S3_SECRET_ACCESS_KEY <r2-secret-key>
vercel env add S3_PUBLIC_URL https://<tu-dominio-r2-o-public>.com/fit-app-uploads
```

> **`STORAGE_DRIVER=local`** (default, sin la var) sigue funcionando en dev/contenedores y
> escribe a `UPLOAD_DIR` servido por `main.ts`. En Vercel **debe ser `s3`** (FS de solo lectura).
> El adaptador es compatible con cualquier bucket S3: Cloudflare R2, AWS S3, MinIO o
> **Supabase Storage** (endpoint `https://<ref>.supabase.co/storage/v1/s3`, con las
> credenciales API de Storage). Todos sin tarjeta en su tier gratuito.

### C-6.3. Runbook de migraciones (se hace UNA vez, no en build)
No hay `start.sh` en serverless; las migraciones no corren en el arranque de la función. Aplicarlas
una sola vez (o tras cada cambio de schema) así:

```bash
# 1. Traer las env de Vercel a .env (usa DIRECT_URL para migraciones)
vercel env pull .env.production

# 2. Aplicar migraciones contra DIRECT_URL
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```
Alternativa con GitHub Action (`D-4`): workflow que ejecuta lo mismo usando el secret `DIRECT_URL`
en cada push a `main`. No poner `prisma migrate deploy` en el `buildCommand` de Vercel (la DB puede
no ser alcanzable desde el entorno de build y romper el deploy).

### C-6.4. Riesgos a tener claros (documentados para el usuario)
| Riesgo | Impacto y plan |
|---|---|
| ~~**FS de solo lectura** (`app.useStaticAssets('/uploads')` y subida a disco)~~ | **RESUELTO (Spec C-6.6):** el `UploadService` ahora usa un `StorageAdapter`. Con `STORAGE_DRIVER=s3` (Vercel) sube a un bucket S3/R2 y devuelve su URL pública; el cliente carga la imagen directo desde el bucket (sin pasar por la API). En dev/`local` sigue escribiendo a disco. El `useStaticAssets` de `main.ts` solo aplica a despliegues no-serverless. |
| ~~**`@nestjs/schedule` (cron de resolución de disputas `@Cron(EVERY_HOUR)`)**~~ | **RESUELTO:** la lógica de resolución se extrajo a `apps/api/src/modules/disputes/dispute-resolution.logic.ts` (compartida, sin Nest). El procesador de Nest la sigue usando en entornos con proceso residente; en Vercel un endpoint serverless `api/cron/disputes.ts` (protegido por `CRON_SECRET`) la invoca, y un GitHub Action horario (`.github/workflows/cron-disputes.yml`, cada hora) lo dispara con el token. `vercel.json` quitó el rewrite catch-all para no interceptar `/api/cron/disputes`. |
| **Cold starts + timeout 10s (Hobby)** | Nest + Prisma arrancan ~1-3s en frío. `memory: 1024` reduce frecuencia de cold starts. Queries/mutaciones muy largas pueden superar los 10s y fallar. |
| **Prisma engine en el bundle** | `binaryTargets: ["native","rhel-openssl-3.0.x"]` en `schema.prisma` (Spec D-1) + `prisma generate` en build asegura el engine de Amazon Linux 2023. `includeFiles` en `vercel.json` lo incluye explícitamente. |

### C-6.5. `fly.toml` (obsoleto)
El archivo `fly.toml` (deploy anterior en Fly.io) **queda obsoleto** con este cambio a Vercel y ya no
se usa. No se eliminó; el usuario puede borrarlo cuando quiera:
```bash
git rm fly.toml
```
Igualmente `render.yaml` / `render.yaml.example` (deploy en Render) quedan sin uso si se migra 100% a Vercel.

### C-6.6. Uploads a object storage (RESUELVE el FS de solo lectura)

El `UploadService` (`apps/api/src/common/services/upload.service.ts`) ya no escribe en disco
cuando `STORAGE_DRIVER=s3`. Usa una interfaz `StorageAdapter` con dos implementaciones:
`LocalStorageAdapter` (disco, dev) y `S3StorageAdapter` (bucket S3-compatible, Vercel).

**Pasos (Cloudflare R2 — cuenta gratuita, sin tarjeta):**
1. En el dashboard de Cloudflare creá un bucket, p.ej. `fit-app-uploads`.
2. En *R2 → API tokens* generá un token `Object Read & Write` para ese bucket.
3. Habilitá **Public access** (permite GET público) o usá un dominio personalizado.
   Anotá la URL pública base: `https://<public>/fit-app-uploads` o
   `https://<account>.r2.cloudflarestorage.com/fit-app-uploads`.
4. Configurá **CORS del bucket** para que el web y la app nativa puedan leer las imágenes:
   ```json
   [
     {
       "AllowedOrigins": ["https://duver0.github.io", "app://localhost", "exp://*"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```
5. Seteá las env vars `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_ENDPOINT`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` (ver bloque de comandos arriba).

**Alternativa sin Cloudflare — Supabase Storage (también gratis, sin tarjeta):**
- Bucket `fit-app-uploads` con **public** policy.
- `S3_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3`
- `S3_REGION=auto`, `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` = las credenciales de
  Storage API de Supabase. `S3_PUBLIC_URL=https://<ref>.supabase.co/storage/v1/object/public/fit-app-uploads`.
- Mismo adaptador, sin cambios de código.

**Comportamiento resultante:** los endpoints `POST /upload/avatar|group|exercise` siguen
igual; ahora devuelven una URL del bucket (`https://.../avatars/<uuid>.jpg`) en lugar de
`/uploads/...`. El móvil/web simplemente renderizan esa URL. Al reemplazar una imagen, la
anterior se borra del bucket (el `deleteFileByUrl` llama al adaptador).
