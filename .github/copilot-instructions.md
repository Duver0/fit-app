# Fit App — Copilot Instructions

## Project Overview
React Native (Expo) + NestJS monorepo for a gym ranking platform where users create groups, log exercise performance, and compete on leaderboards.

## Tech Stack
- Frontend: React Native, Expo, TypeScript, Apollo GraphQL, Zustand, NativeWind
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, GraphQL (code-first)
- Auth: Local auth (JWT + bcrypt)
- Storage: Local disk (`./uploads/`)
- Queue/Cache: Redis + Bull (optional, for future use)
- PWA: Workbox, expo-pwa, expo-updates

## Architecture Principles
1. **Clean Architecture**: Resolver → Service → Prisma
2. **Feature-based modules**: Each feature is self-contained (module, service, resolver, DTOs, tests)
3. **DDD**: Bounded contexts — Identity, Users, Groups, Exercises, Performance, Ranking, Disputes
4. **RBAC**: 3 roles — SUPER_ADMIN, OWNER (group), MEMBER (group), USER
5. **Type safety**: Strict TypeScript, shared types in `packages/shared/`

## Key Conventions

### Backend
- GraphQL resolvers are thin — delegate to service layer
- All mutations need auth guard (GqlAuthGuard) by default
- State-changing operations log to AuditService
- DTOs validated with class-validator decorators
- Rankings use Prisma ORM with `orderBy` and pagination

### Frontend
- File-based routing via Expo Router
- Screens are default exports in `app/` directory
- All screens handle: loading, error, and empty states
- Custom hooks for data fetching (useRanking, useGroups, useAuth)
- Zustand for client state (auth, theme, UI), Apollo for server state
- Theme via ThemeProvider + useTheme hook (light/dark mode)
- Minimum 44×44pt touch targets

### Database
- UUID primary keys
- Snake_case table/column names via Prisma @map/@@map
- @updatedAt for all models
- Composite unique constraints for business keys
- Indexes on all foreign keys

## File Structure
- Backend modules: `apps/api/src/modules/{feature}/`
- Frontend screens: `apps/mobile/app/(app)/{feature}/`
- Frontend components: `apps/mobile/src/components/{category}/`
- Shared types: `packages/shared/src/`
- Prisma schema: `apps/api/prisma/schema.prisma`
- OpenCode agents: `.opencode/agents/`
- OpenCode skills: `.opencode/skills/`

## Naming Conventions
- Backend files: kebab-case (groups.service.ts, create-group.input.ts)
- Frontend files: PascalCase for components (GroupCard.tsx), camelCase for hooks (useRanking.ts)
- GraphQL: camelCase for fields, PascalCase for types
- Database: snake_case columns, plural snake_case tables

## Testing
- Jest for backend unit/integration tests
- Vitest for frontend tests (planned)
- Goal: 80%+ overall coverage

## API Patterns
- Queries: `ranking(exerciseId, page, limit): RankingConnection`
- Mutations: `upsertPerformance(input: UpsertPerformanceInput!): PerformanceRecord`
- Auth: Bearer JWT in Authorization header
- Pagination: `{ items, totalCount, currentPage, totalPages }`

## Code Generation
Use the following skills for generating code:
- `create-feature`: Complete feature module (backend + frontend)
- `create-entity`: Domain entity across Prisma + NestJS + shared types
- `create-endpoint`: GraphQL resolver or REST endpoint
- `create-screen`: Expo Router screen with all states
- `create-component`: Reusable UI component
- `create-hook`: Custom React hook
- `create-test`: Test file for any layer
