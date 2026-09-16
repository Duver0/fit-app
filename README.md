# Fit App

Plataforma de ranking de gimnasio. Usuarios crean grupos, registran su progreso en ejercicios y compiten en rankings con sistema de disputas por mayoría simple.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS, TypeScript, GraphQL (code-first), Prisma, PostgreSQL |
| Frontend | React Native, Expo, Apollo Client, Zustand, NativeWind |
| Auth | Local (JWT + bcrypt, email/password) |
| Storage | Local (uploads en disco servidos por Nginx) |
| Queue | Redis + Bull (disputas) |
| PWA | Workbox, expo-pwa |

## Estructura

```
fit-app/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Modelos de datos
│   │   ├── src/
│   │   │   ├── main.ts               # Entry point
│   │   │   ├── app.module.ts         # Módulo raíz
│   │   │   ├── prisma/               # Prisma service + module
│   │   │   ├── common/
│   │   │   │   ├── decorators/       # @CurrentUser
│   │   │   │   ├── models/           # GraphQL ObjectTypes
│   │   │   │   └── services/         # Audit, Upload
│   │   │   └── modules/
│   │   │       ├── auth/             # Login, register, guards, JWT
│   │   │       ├── users/            # Perfil de usuario
│   │   │       ├── groups/           # CRUD grupos, membresías
│   │   │       ├── invitations/      # Invitaciones por email
│   │   │       ├── exercises/        # Ejercicios por grupo
│   │   │       ├── performance/      # Marcas (upsert)
│   │   │       ├── ranking/          # Rankings con top 3
│   │   │       ├── disputes/         # Disputas + votación 51%
│   │   │       └── admin/            # Panel super admin
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                       # Expo React Native
│       ├── app/                      # Expo Router screens
│       │   ├── (auth)/               # Login, Register
│       │   ├── (app)/
│       │   │   ├── (tabs)/
│       │   │   │   ├── groups/       # Lista, dashboard, ejercicio
│       │   │   │   ├── profile/      # Perfil + tema
│       │   │   │   └── admin/        # Panel admin
│       │   │   └── invitations/      # Invitaciones pendientes
│       │   └── index.tsx             # Root redirect
│       └── src/
│           ├── hooks/                # useAuth, useGroups, useRanking
│           ├── stores/               # authStore, themeStore, uiStore
│           ├── lib/                  # Apollo client, queries, PWA
│           └── theme/                # Colores pastel, ThemeProvider
│
├── packages/
│   └── shared/                       # Tipos compartidos (enums)
│
├── docs/
│   └── specs/auth-and-groups/        # Especificaciones técnicas
│       ├── README.md
│       ├── 01-database.md     ✅
│       ├── 02-api.md          ✅
│       ├── 03-backend.md      ✅
│       ├── 04-frontend.md     ✅
│       └── 05-tests.md        ✅
│
├── package.json                      # Monorepo (npm workspaces)
└── .github/copilot-instructions.md   # Instrucciones para IA
```

## Requisitos

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (para Bull queue)
- Redis 7+ (para Bull queue)

## Despliegue (producción)

La aplicación corre en servicios cloud gratuitos:

| Servicio | URL / Acceso | Plan |
|----------|-------------|------|
| **API (Vercel)** | [https://fit-app-lake-gamma.vercel.app](https://fit-app-lake-gamma.vercel.app) | Hobby (serverless) |
| **Frontend (GitHub Pages)** | [https://duver0.github.io/fit-app](https://duver0.github.io/fit-app) | Free |
| **Base de datos (Neon)** | [https://console.neon.tech](https://console.neon.tech) → project `fit-app` | Free (0.5GB) |
| **Repositorio** | [https://github.com/Duver0/fit-app](https://github.com/Duver0/fit-app) | — |
| **CI/CD** | GitHub Actions (frontend) + Vercel Auto-Deploy (backend) | — |

> **Nota:** El backend migró de Render a Vercel Serverless (sin Redis, sin WebSockets, polling en cliente).

### Endpoints de la API

| Endpoint | URL |
|----------|-----|
| GraphQL | `https://fit-app-lake-gamma.vercel.app/graphql` |
| Health | `https://fit-app-lake-gamma.vercel.app/health` |

### Variables de entorno (producción)

Están configuradas en el dashboard de Vercel → Settings → Environment Variables. No commits de secrets.

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Pooled connection → Neon (Prisma Client) |
| `DIRECT_URL` | Direct connection → Neon (Prisma Migrate) |
| `JWT_SECRET` | Secret para JWT |
| `CORS_ORIGIN` | `https://duver0.github.io` |
| `VAPID_PUBLIC_KEY` | Clé pública Web Push (VAPID) |
| `VAPID_PRIVATE_KEY` | Clé privada Web Push (VAPID) |
| `VAPID_EMAIL` | Email para VAPID |

## Ejecutar en local (desarrollo)

```bash
# 1. Clonar e instalar
git clone <repo>
cd fit-app
npm install

# 2. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con datos locales

# 3. Iniciar PostgreSQL (ejemplo con Docker)
docker run -d --name fit-postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=12345678 \
  -e POSTGRES_DB=proyectos \
  -p 5432:5432 postgres:17

# 4. Correr migraciones Prisma
npm run db:migrate -w apps/api

# 5. Iniciar backend (http://localhost:4000)
npm run api:dev

# 6. En otra terminal, iniciar mobile (Expo)
npm run mobile:dev
```

## Comandos útiles

```bash
# Backend
npm run api:dev          # Desarrollo con hot-reload
npm run api:build        # Compilar producción
npm run db:migrate -w apps/api   # Migraciones
npm run db:push -w apps/api      # Push schema directo
npm run db:generate -w apps/api  # Generar Prisma Client
npm run test -w apps/api         # Tests

# Mobile
npm run mobile:dev       # Expo dev server
npm run mobile:test -w apps/mobile  # Tests frontend
```

## API

### GraphQL

El schema se genera automáticamente en `apps/api/src/schema.gql` al iniciar el servidor. Endpoint:

```
http://localhost:4000/graphql
```

Producción: `https://fit-app-api-3zds.onrender.com/graphql`

### REST (uploads)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/upload/avatar` | JWT (Bearer) | Subir avatar (multipart, campo `file`, máx 5MB) |

El archivo se guarda en disco y se actualiza `avatarUrl` del usuario automáticamente.

### Queries principales

```graphql
me: User!
myGroups: [Group!]!
group(id: ID!): Group!
ranking(exerciseId: ID!, page: Int, limit: Int): RankingConnection!
top3Ranking(groupId: ID!): [ExerciseRankingPreview!]!
myInvitations: [Invitation!]!
```

### Mutaciones principales

```graphql
register(input: RegisterInput!): AuthPayload!
login(input: LoginInput!): AuthPayload!
createGroup(input: CreateGroupInput!): Group!
upsertPerformance(input: UpsertPerformanceInput!): PerformanceRecord!
createDispute(input: CreateDisputeInput!): Dispute!
voteOnDispute(disputeId: ID!, vote: Boolean!): Dispute!
inviteToGroup(groupId: ID!, inviteeEmail: String!): Invitation!
acceptInvitation(invitationId: ID!): Boolean!
```

## Roles

| Rol | Permisos |
|---|---|
| `SUPER_ADMIN` | CRUD global: eliminar grupos, usuarios, ejercicios |
| `GROUP_OWNER` | Crear ejercicios, editar/eliminar grupo, expulsar miembros |
| `GROUP_MEMBER` | Registrar/actualizar marca, disputar, ver rankings |
| `USER` | Ver perfil, grupos (sin membresía) |

## Testing

```bash
# Backend (Jest)
npm run test -w apps/api

# Frontend (Vitest)
npm run test -w apps/mobile
```

Actualmente **20 tests unitarios** pasando en:
- `AuthService` — register, login, validateUser
- `GroupsService` — CRUD, permisos owner/member
- `PerformanceService` — upsert, validaciones
- `DisputesService` — create, vote, resolución 51%

## Feature specs

Cada feature tiene especificaciones técnicas en `docs/specs/` divididas por capa:

| Archivo | Estado |
|---------|--------|
| `01-database.md` | ✅ Completado |
| `02-api.md` | ✅ Completado |
| `03-backend.md` | ✅ Completado |
| `04-frontend.md` | ✅ Completado |
| `05-tests.md` | ✅ Completado |
