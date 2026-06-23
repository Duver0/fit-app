---
name: create-migration
description: Use when generating a Prisma migration for schema changes with verification and rollback instructions.
---

# create-migration

## Purpose
Generate a Prisma migration for schema changes with verification and rollback instructions.

## Inputs
- `name`: string — migration name (e.g., "add_dispute_vote_index")
- `verifySql`: boolean (default: true)
- `seedAfter`: boolean (default: false)
- `environment`: 'development' | 'staging' | 'production'

## Migration Workflow
```bash
# 1. Generate migration
npx prisma migrate dev --name {name}

# 2. Verify generated SQL
cat prisma/migrations/*{name}/migration.sql

# 3. Apply migration locally
npx prisma migrate dev

# 4. Generate Prisma client
npx prisma generate

# 5. Run tests
pnpm test

# 6. Commit migration files
git add prisma/migrations/
git commit -m "feat(db): {name}"
```

## Best Practices
1. Never edit applied migrations — create new migrations
2. Review generated SQL before applying
3. One migration per logical change (atomic)
4. Use explicit transaction blocks for multi-table changes
5. Add comments to SQL for complex migrations
6. Test rollback on local before production
7. Zero-downtime: expand-contract pattern (add nullable, backfill, make required)
8. Production migrations: backup first, run during low traffic

## Validation Checklist
```
□ Generated SQL reviewed and correct
□ No destructive changes without approval
□ Migration applied successfully in development
□ Prisma client regenerated
□ All tests passing after migration
□ Rollback plan documented
□ Migration committed to version control
```
