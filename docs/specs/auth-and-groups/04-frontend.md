# Auth & Groups — Frontend

> **Status: ✅ COMPLETADO** — App Expo Router con 11 screens, Apollo Client, Zustand stores, hooks, tema claro/oscuro, y utilidad PWA. Estructura completa lista para `npm install` en `apps/mobile/`.

## Objetivo
Implementar todas las pantallas, componentes, hooks, stores de estado, y configuración PWA para la plataforma.

## Dependencias
- `02-api.md` (contratos GraphQL)
- `03-backend.md` (lógica de negocio)

---

## Estructura de archivos

```
apps/mobile/
├── app/
│   ├── _layout.tsx                    # Root layout (ThemeProvider, AuthProvider)
│   ├── index.tsx                       # Splash / redirect
│   ├── (auth)/
│   │   ├── _layout.tsx                # Auth layout (stack navigator)
│   │   ├── login.tsx                  # Pantalla de login
│   │   ├── register.tsx               # Pantalla de registro
│   │   └── web-pwa-install.tsx        # Banner PWA install (solo web)
│   ├── (app)/
│   │   ├── _layout.tsx                # App layout (tab navigator)
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── groups/
│   │   │   │   ├── index.tsx          # Lista de grupos + crear grupo
│   │   │   │   ├── [groupId]/
│   │   │   │   │   ├── index.tsx      # Dashboard del grupo (top 3 por ejercicio)
│   │   │   │   │   ├── members.tsx    # Lista de miembros + invitar
│   │   │   │   │   ├── settings.tsx   # Config del grupo (owner)
│   │   │   │   │   └── exercises/
│   │   │   │   │       └── [exerciseId].tsx  # Ranking completo + upsert marca
│   │   │   │   └── create.tsx         # Crear grupo
│   │   │   ├── profile/
│   │   │   │   ├── index.tsx          # Mi perfil
│   │   │   │   └── edit.tsx           # Editar perfil
│   │   │   └── admin/
│   │   │       └── index.tsx          # Panel super admin
│   │   └── invitations/
│   │       └── index.tsx              # Lista de invitaciones pendientes
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── Podium.tsx            # Podio top 3 (1°, 2°, 3°)
│   │   │   └── ThemeToggle.tsx
│   │   ├── groups/
│   │   │   ├── GroupCard.tsx
│   │   │   ├── GroupList.tsx
│   │   │   └── MemberList.tsx
│   │   ├── ranking/
│   │   │   ├── RankingRow.tsx
│   │   │   ├── Top3Card.tsx
│   │   │   └── ExercisePreview.tsx   # Top 3 de un ejercicio en dashboard
│   │   └── disputes/
│   │       ├── DisputeCard.tsx
│   │       └── VoteButton.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGroups.ts
│   │   ├── useGroup.ts
│   │   ├── useExercises.ts
│   │   ├── useRanking.ts
│   │   ├── usePerformance.ts
│   │   ├── useDisputes.ts
│   │   ├── useInvitations.ts
│   │   └── usePWA.ts
│   ├── stores/
│   │   ├── authStore.ts             # Zustand: token, user
│   │   ├── themeStore.ts            # Zustand: dark/light
│   │   └── uiStore.ts               # Zustand: loading, toasts
│   ├── lib/
│   │   ├── apollo.ts                 # Apollo Client config
│   │   ├── graphql.ts                # GraphQL operations (gql tags)
│   │   └── pwa.ts                    # PWA install helper
│   └── theme/
│       ├── colors.ts
│       └── ThemeProvider.tsx
```

---

## Screens

### Login (`(auth)/login.tsx`)
- Logo de la app + nombre.
- Botón "Iniciar sesión con Google" (Auth0 Google SSO).
- Separador "o".
- Inputs: email, password.
- Botón "Iniciar sesión".
- Link "¿No tienes cuenta? Regístrate".
- **Estados**: idle, loading (spinner en botón), error (toast/alert).

### Register (`(auth)/register.tsx`)
- Inputs: nombre, email, celular, contraseña, confirmar contraseña.
- Botón "Crear cuenta".
- Validación inline (email válido, contraseña ≥8 chars, teléfono opcional).
- Link "¿Ya tienes cuenta? Inicia sesión".

### Groups List (`(tabs)/groups/index.tsx`)
- Header: "Mis Grupos" + avatar de perfil (navega a profile).
- Lista de `GroupCard` (avatar, nombre, member count).
- Botón flotante "+" para crear grupo.
- Pull-to-refresh.
- **Estados**: loading (skeleton cards), empty (EmptyState: "Únete o crea un grupo"), error.

### Create Group (`(tabs)/groups/create.tsx`)
- Inputs: nombre, descripción (textarea), avatar (image picker).
- Botón "Crear grupo".

### Group Dashboard (`(tabs)/groups/[groupId]/index.tsx`)
- Header con nombre y avatar del grupo, botón de configuración (owner) o salir.
- **Sección "Ranking"**: Grid de `ExercisePreview` (uno por ejercicio del grupo).
  - Cada preview: nombre del ejercicio, podio top 3 (oro, plata, bronce con nombres y marcas).
  - Al tocar → navega a `exercises/[exerciseId]`.
- **Estados**: loading (skeleton grid), empty (sin ejercicios aún — solo owner ve botón crear), error.

### Exercise Detail (`(tabs)/groups/[groupId]/exercises/[exerciseId].tsx`)
- Header con nombre del ejercicio y unidad.
- **Ranking completo**: lista de `RankingRow` con posición, avatar, nombre, valor, badge de disputa si aplica.
- **Mi marca**: al inicio o al final, sección "Mi marca" con valor actual y botón "Actualizar".
  - Si no tiene marca → botón "Registrar marca".
- Modal/form inline para ingresar valor numérico.
- Cada `RankingRow` tiene botón "Disputar" (solo para marcas de otros).
- **Estados**: loading, empty (nadie ha registrado marca), error.

### Members (`(tabs)/groups/[groupId]/members.tsx`)
- Lista de miembros con rol (OWNER badge, MEMBER).
- Botón "Invitar" → modal con input de email.
- Owner puede eliminar miembros (swipe-to-delete o menú contextual).

### Group Settings (`(tabs)/groups/[groupId]/settings.tsx`)
- Visible solo para GROUP_OWNER.
- Editar nombre, descripción, avatar.
- Botón "Crear ejercicio" → modal con nombre y unidad.
- Botón "Eliminar grupo" (confirmación).

### Profile (`(tabs)/profile/index.tsx`)
- Avatar (grande), nombre, email, celular.
- Botón "Editar perfil".
- Sección "Invitaciones pendientes" con contador.
- Theme toggle (dark/light).
- Botón "Cerrar sesión".

### Edit Profile (`(tabs)/profile/edit.tsx`)
- Image picker para avatar.
- Inputs editables: nombre, celular.
- Botón "Guardar cambios".

### Admin Panel (`(tabs)/admin/index.tsx`)
- Visible solo para SUPER_ADMIN.
- Tabs: Grupos, Usuarios, Ejercicios.
- Cada tab: lista paginada con búsqueda.
- Acciones: eliminar grupo, eliminar usuario, eliminar ejercicio, editar nombre de grupo.
- Confirmación antes de cada acción destructiva.

### Invitations (`invitations/index.tsx`)
- Lista de invitaciones pendientes.
- Cada una: nombre del grupo, inviter, botones "Aceptar" / "Rechazar".
- **Estados**: loading, empty ("No tienes invitaciones"), error.

---

## Hooks

### useAuth
```ts
// Auth0 + Apollo integration
function useAuth() {
  return {
    user: User | null,
    isLoading: boolean,
    login: (input: LoginInput) => Promise<void>,
    loginWithGoogle: () => Promise<void>,
    register: (input: RegisterInput) => Promise<void>,
    logout: () => void,
  }
}
```

### useGroups
```ts
function useGroups() {
  return {
    groups: Group[],
    isLoading: boolean,
    error: Error | null,
    refetch: () => void,
  }
}
```

### useGroup(groupId)
```ts
function useGroup(groupId: string) {
  return {
    group: Group | null,
    isLoading: boolean,
    error: Error | null,
    refetch: () => void,
  }
}
```

### useRanking(exerciseId)
```ts
function useRanking(exerciseId: string) {
  return {
    ranking: PerformanceRecord[],  // ordenado por rank
    myPerformance: PerformanceRecord | null,
    isLoading: boolean,
    error: Error | null,
    refetch: () => void,
    upsertPerformance: (value: number) => Promise<void>,
    createDispute: (performanceId: string, reason: string) => Promise<void>,
  }
}
```

### useDisputes(performanceId)
```ts
function useDisputes(performanceId: string) {
  return {
    disputes: Dispute[],
    myVote: DisputeVote | null,
    vote: (disputeId: string, vote: boolean) => Promise<void>,
  }
}
```

### usePWA
```ts
function usePWA() {
  return {
    canInstall: boolean,   // beforeinstallprompt event fired
    install: () => Promise<void>,
    isInstalled: boolean,
  }
}
```

### useInvitations
```ts
function useInvitations() {
  return {
    invitations: Invitation[],
    accept: (id: string) => Promise<void>,
    decline: (id: string) => Promise<void>,
    refresh: () => void,
  }
}
```

---

## Stores (Zustand)

### authStore
```ts
interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}
```

### themeStore
```ts
interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (val: boolean) => void
}
```

### uiStore
```ts
interface UIState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  globalLoading: boolean
  setGlobalLoading: (val: boolean) => void
}
```

---

## Theme & Design System

### Colores (modo claro)
| Token | Valor |
|---|---|
| `primary` | `#A8D5BA` (verde pastel) |
| `secondary` | `#F7D1E0` (rosa pastel) |
| `accent` | `#B8D4E3` (azul pastel) |
| `background` | `#FFF8F0` (crema) |
| `surface` | `#FFFFFF` |
| `text` | `#2D3436` |
| `textSecondary` | `#636E72` |
| `success` | `#55EFC4` |
| `warning` | `#FDCB6E` |
| `error` | `#FF7675` |

### Modo oscuro
- Invertir: `background` → `#1A1A2E`, `surface` → `#16213E`, `text` → `#E0E0E0`.
- Pasteles se mantienen pero con menor saturación.

### Componentes UI
- **Button**: rounded-full, pastel primary bg, text oscuro, min-h-44.
- **Input**: rounded-xl, bg-surface, border pastel.
- **Card**: rounded-2xl, bg-surface, shadow-sm.
- **Avatar**: rounded-full, 40x40 (lista) / 80x80 (perfil).
- **Podium**: 3 columnas: plata (2°), oro (1°), bronce (3°) con alturas escaladas.

---

## PWA Configuration

### next-pwa / expo-pwa
- Service worker con Workbox (precache + runtime cache para Apollo queries).
- Manifest: `name: "Fit App"`, `short_name: "FitApp"`, theme_color pastel, background_color crema.
- Iconos: 192x192, 512x512 (generados desde asset).

### Install Banner
- En `(auth)/web-pwa-install.tsx`: banner que aparece cuando `canInstall` es true.
- Botón "Instalar aplicación" que dispara `beforeinstallprompt.prompt()`.
- Se oculta después de instalado o si se rechaza.

### Web-specific
- La app web (expo web) sirve el mismo código.
- En el login, si `isWeb` y `!isInstalled`, mostrar el banner PWA.
- Offline: página de fallback con mensaje "Sin conexión — los datos se sincronizarán cuando vuelvas".

---

## GraphQL Operations (src/lib/graphql.ts)

```graphql
fragment UserFields on User {
  id email name phone avatarUrl role createdAt
}

fragment GroupFields on Group {
  id name description avatarUrl memberCount createdAt
}

query Me { me { ...UserFields } }
query MyGroups { myGroups { ...GroupFields } }

mutation Register($input: RegisterInput!) {
  register(input: $input) { accessToken user { ...UserFields } }
}

mutation Login($input: LoginInput!) {
  login(input: $input) { accessToken user { ...UserFields } }
}

mutation CreateGroup($input: CreateGroupInput!) {
  createGroup(input: $input) { ...GroupFields }
}

query Ranking($exerciseId: ID!, $page: Int, $limit: Int) {
  ranking(exerciseId: $exerciseId, page: $page, limit: $limit) {
    items { id value rank user { id name avatarUrl } }
    totalCount currentPage totalPages
  }
}

mutation UpsertPerformance($input: UpsertPerformanceInput!) {
  upsertPerformance(input: $input) { id value }
}

mutation CreateDispute($input: CreateDisputeInput!) {
  createDispute(input: $input) { id status }
}

mutation VoteOnDispute($disputeId: ID!, $vote: Boolean!) {
  voteOnDispute(disputeId: $disputeId, vote: $vote) { id vote }
}
```
