---
name: create-feature
description: Use when generating a complete feature module across NestJS backend and React Native frontend following the feature-based architecture pattern.
---

# create-feature

## Purpose
Generate a complete feature module across backend (NestJS) and frontend (React Native).

## Inputs
- `featureName`: string — e.g., "disputes", "performance"
- `type`: 'backend' | 'frontend' | 'both'
- `withResolver`: boolean (default: true)
- `withService`: boolean (default: true)
- `withRepository`: boolean (default: true)
- `withTests`: boolean (default: true)

## Outputs
**Backend** (`type: 'backend'`):
- `apps/api/src/modules/{featureName}/{featureName}.module.ts`
- `apps/api/src/modules/{featureName}/{featureName}.service.ts`
- `apps/api/src/modules/{featureName}/{featureName}.resolver.ts`
- `apps/api/src/modules/{featureName}/{featureName}.repository.ts`
- `apps/api/src/modules/{featureName}/dto/` and `entities/`
- `apps/api/src/modules/{featureName}/__tests__/`

**Frontend** (`type: 'frontend'`):
- `apps/mobile/app/{route}` — Expo Router screens
- `apps/mobile/src/components/{featureName}/` — components
- `apps/mobile/src/hooks/use{FeatureName}.ts`
- `apps/mobile/src/graphql/{featureName}.queries.ts` / `*.mutations.ts`

## Best Practices
1. Feature folder is self-contained (module registers everything)
2. Feature module imported in `app.module.ts` or parent module
3. Repository layer abstracts Prisma calls
4. Resolvers are thin — delegate to service layer
5. DTOs have validation decorators (class-validator)
6. Tests follow Arrange → Act → Assert
7. All state-changing operations log to AuditService

## Validation Checklist
```
□ Module properly registers providers and exports
□ Service injected with constructor DI
□ Resolver has @UseGuards for authentication
□ DTOs validated with class-validator
□ Repository follows same pattern as existing modules
□ Tests cover: success, validation error, unauthorized
□ Feature folder uses kebab-case naming
□ No circular dependencies
```
