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
| ~~**Uploads a FS local** (`main.ts` sirve `uploads/`): en serverless el FS es efímero/RO.~~ | **RESUELTO:** el subsistema de uploads (endpoints `POST /upload/avatar\|group\|exercise`, `UploadService`, adaptadores de storage y `useStaticAssets` en `main.ts`) fue **eliminado**. Las imágenes (avatares de grupo/usuario, imágenes de ejercicio) se consumen únicamente desde APIs externas (DiceBear, Pixabay, Pexels, Unsplash) vía URL; no hay subida de archivos del usuario. No se requiere object storage. |
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
| `APP_URL` | `https://fit-app-lake-gamma.vercel.app` | URL pública de la API (alias estable del proyecto en Vercel). |

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
vercel env add APP_URL https://fit-app-lake-gamma.vercel.app
```

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
| ~~**FS de solo lectura** (`app.useStaticAssets('/uploads')` y subida a disco)~~ | **RESUELTO:** el subsistema de uploads fue eliminado por completo (ver C-6.6). No hay `useStaticAssets` ni subida a disco; las imágenes vienen de APIs externas por URL. |
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

### C-6.6. Uploads — eliminados (no se requiere object storage)

El subsistema de subida de archivos **fue eliminado** del backend:
- Endpoints REST `POST /upload/avatar`, `/upload/group`, `/upload/exercise` (y su
  `UploadController`).
- `UploadService`, la interfaz `StorageAdapter` y los adaptadores `LocalStorageAdapter` /
  `S3StorageAdapter`.
- `app.useStaticAssets('/uploads')` y la creación de `UPLOAD_DIR` en `main.ts`.
- Funciones `uploadFile` / `uploadExerciseImage` en el cliente móvil.

**Motivo:** en la app las imágenes (avatares de usuario/grupo e imágenes de ejercicio) se
eligen únicamente desde fuentes externas — DiceBear para avatares y Pixabay/Pexels/Unsplash
para stock — y se guardan como URL. El cliente nunca sube un archivo del usuario, así que no
hay nada que persistir en un bucket. Por ende **no se necesita object storage (R2/S3)** y
las variables `STORAGE_DRIVER` / `S3_*` / `UPLOAD_DIR` ya no existen.

---

## C-7. Build nativo (EAS) — pasos para el usuario

El backend ya corre en Vercel. El binario nativo (Android/iOS) se genera con **EAS Build**,
que requiere la cuenta de Expo/EAS del usuario y las credenciales de firma de Apple/Google
(por eso no lo ejecuta el agente). La URL de la API ya apunta a producción por defecto
(`apps/mobile/src/lib/apollo.ts` → `https://fit-app-lake-gamma.vercel.app/graphql`) y además
se hornea vía `EXPO_PUBLIC_API_URL` en `apps/mobile/eas.json`.

**Prerrequisitos**
1. Cuenta en [expo.dev](https://expo.dev) (el tier gratuito alcanza para builds).
2. Para iOS en dispositivo/App Store: cuenta de Apple Developer ($99/año). Para Android en
   Play Store: cuenta de Google Play (EAS genera el keystore automáticamente en builds
   `internal`/`preview`).
3. Si la app usa Auth0 para login nativo, agregar el scheme `fit-app://*` a los *Allowed
   Callback URLs* y *Allowed Logout URLs* del tenant de Auth0.

**Comandos**
```bash
cd apps/mobile
npx eas login                 # abre el navegador para autenticarse
npx eas build -p android      # primer build: crea/enlaza el proyecto EAS y escribe
                              # extra.eas.projectId en app.config.js
npx eas build -p ios          # igual para iOS (pide Apple ID en el primer build)
# Build de producción para ambas plataformas:
npx eas build -p all --profile production
```

- El `eas.json` define los perfiles `development`, `preview` y `production`, todos con
  `EXPO_PUBLIC_API_URL` apuntando a Vercel.
- `eas-cli` quedó fijado en devDependencies (`^7.4.0`) para builds reproducibles.
- El primer `eas build` pedirá vincular el proyecto a tu cuenta (escribe `projectId` en
  `app.config.js`); eso es esperado.
- Para subir a las tiendas: `npx eas submit -p android` / `-p ios` (requiere las cuentas
  correspondientes).
