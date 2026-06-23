---
name: create-entity
description: Use when generating a new domain entity across Prisma schema, NestJS entity, and shared types package.
---

# create-entity

## Purpose
Generate a new domain entity across Prisma schema, backend entity, and shared types.

## Inputs
- `name`: string — PascalCase entity name
- `fields`: Array of `{ name, type, required, unique?, default?, relation? }`
- `enums?`: Array of `{ name, values }`
- `indexes?`: Array of `{ fields, unique? }`

## Outputs
- Updated `prisma/schema.prisma` with model definition
- New `apps/api/src/modules/{entity}/entities/{entity}.entity.ts`
- Updated `packages/shared/src/types/` with TypeScript type

## Best Practices
1. Always use UUID primary keys
2. Use `@map` for snake_case column names in PostgreSQL
3. Use `@@map` for snake_case table names
4. Add `@@index` for query patterns (foreign keys, sort fields)
5. Use `@@unique` for business key constraints
6. Add `@updatedAt` for tracking changes
7. Entity class should match Prisma model but add domain-specific fields
8. Update shared types package alongside Prisma schema

## Validation Checklist
```
□ Prisma model defined with proper types
□ Foreign keys have @@index
□ Business unique constraints defined (@@unique)
□ Enum used for constrained string fields
□ Default values set where appropriate
□ Cascade delete configured where appropriate
□ Entity class matches Prisma model
□ Existing migrations not modified
```
