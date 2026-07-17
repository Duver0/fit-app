# Exercise Refactor — Database

> **Estado: ✅ COMPLETADO** (solo falta ejecutar `prisma migrate dev` en entorno con BD)

## Objetivo
Agregar el campo `imageUrl` al modelo `Exercise` en Prisma y generar la migración correspondiente.

## Dependencias
- Ninguna. Es el primer paso del plan.

## Database

### Modelo `Exercise` — modificaciones

```prisma
// schema.prisma — modelo Exercise actualizado

model Exercise {
  id        String       @id @default(uuid()) @db.Uuid
  groupId   String       @map("group_id") @db.Uuid
  name      String
  unit      ExerciseUnit @default(KG)
  imageUrl  String?      @map("image_url") @db.Text    // ← NUEVO
  createdBy String       @map("created_by") @db.Uuid
  createdAt DateTime     @default(now()) @map("created_at")
  updatedAt DateTime     @updatedAt @map("updated_at")

  group        Group               @relation(fields: [groupId], references: [id], onDelete: Cascade)
  creator      User                @relation(fields: [createdBy], references: [id])
  performances PerformanceRecord[]

  @@unique([groupId, name, unit])
  @@index([groupId])
  @@map("exercises")
}
```

### Migración

```bash
# 1. Modificar schema.prisma manualmente (agregar campo imageUrl)
# 2. Ejecutar:
npx prisma migrate dev --name add_exercise_image_url
# 3. Esto generará SQL similar a:
#    ALTER TABLE exercises ADD COLUMN image_url TEXT;
# 4. Regenerar el client:
npx prisma generate
```

### Checklist de implementación

| Item | Estado |
|------|--------|
| Schema: agregar `imageUrl String? @map("image_url") @db.Text` al modelo Exercise | ✅ Completo |
| Migración: archivo `20260717120000_add_exercise_image_url/migration.sql` creado | ✅ Completo |
| `prisma generate` ejecutado | ✅ Completo |
| `prisma migrate dev` aplicado en BD | ❌ Pendiente (no hay BD local) |

### Resumen de cambios en schema.prisma

| Archivo | Cambio |
|---------|--------|
| `apps/api/prisma/schema.prisma` | Agregar `imageUrl String? @map("image_url") @db.Text` al modelo `Exercise` después del campo `unit` |
