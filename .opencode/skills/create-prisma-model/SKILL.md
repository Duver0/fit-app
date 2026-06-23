---
name: create-prisma-model
description: Use when adding a new Prisma model to the schema with fields, relations, indexes, and enums.
---

# create-prisma-model

## Purpose
Generate a new Prisma model in the schema, including fields, relations, indexes, and enums.

## Inputs
- `modelName`: string — PascalCase singular
- `tableName`: string — snake_case plural
- `fields`: Array of `{ name, columnName, type, isId, isRequired, isUnique, default?, dbType? }`
- `relations?`: Array of `{ name, model, type, fields?, references?, onDelete? }`
- `indexes?`: Array of `{ fields, unique?, type? }`

## Outputs
- Updated `prisma/schema.prisma` with new model

## Best Practices
1. Every model needs `id` as UUID primary key
2. All foreign keys use `@db.Uuid`
3. String fields have explicit `@db.VarChar(N)` length limits
4. JSON fields use `@db.JsonB`
5. Timestamps always: `createdAt` + `updatedAt`
6. Table names are snake_case plural via `@@map`
7. Column names are snake_case via `@map`
8. Composite unique constraints for business keys
9. Indexes on all foreign keys and query patterns

## Validation Checklist
```
□ All fields have proper dbType for PostgreSQL
□ Foreign key fields match referenced model type
□ Relation onDelete behavior set appropriately
□ @@map(table_name) present for snake_case
□ @map(column_name) on every field
□ @@unique for composite business keys
□ @@index for query patterns
□ No duplicate model names
```
