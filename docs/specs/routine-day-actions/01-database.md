# Acciones de día de rutina — 01-database

## Objetivo

Dejar por escrito que **no se necesita ningún cambio de esquema** para las tres piezas (kebab, fix swap, eliminar día) y fijar las invariantes que el backend debe respetar dentro de una transacción.

## Dependencias

- Ninguna. Es el primer paso del orden (`README.md`).

## Database

Modelos involucrados (`apps/api/prisma/schema.prisma`):

```prisma
model RoutineDay {
  id        String            @id @default(uuid()) @db.Uuid
  userId    String            @map("user_id") @db.Uuid
  dayOfWeek Int               @map("day_of_week")
  name      String?           @map("name")
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercises RoutineExercise[]

  @@unique([userId, dayOfWeek])
  @@index([userId])
  @@map("routine_days")
}

model RoutineExercise {
  id         String     @id @default(uuid()) @db.Uuid
  dayId      String     @map("day_id") @db.Uuid
  exerciseId String     @map("exercise_id") @db.Uuid
  sortOrder  Int        @map("sort_order")
  day        RoutineDay @relation(fields: [dayId], references: [id], onDelete: Cascade)
  exercise   Exercise   @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([dayId, exerciseId])
  @@index([dayId, sortOrder])
  @@map("routine_exercises")
}
```

- **Modelos nuevos o modificaciones:** ninguno. `RoutineDay.name` (`String?`) ya existe y se reutiliza para la regla de nombres del swap (ver `03-backend.md`). `sortOrder: Int` ya existe con índice `[dayId, sortOrder]`.
- **Índices necesarios:** ninguno nuevo. Los existentes cubren: lookup por día (`@@unique([userId, dayOfWeek])`), orden de ejercicios (`@@index([dayId, sortOrder])`), prevención de duplicados (`@@unique([dayId, exerciseId])`).
- **Migraciones:** ninguna. Verificación obligatoria del implementador: `npx prisma validate` y `npx prisma migrate status` en `apps/api` deben salir limpios sin generar migración.

## Invariantes que el backend debe garantizar (sin ayuda del esquema)

1. `dayOfWeek ∈ [0, 6]` en `swapRoutineDays` y `deleteRoutineDay`. El esquema no lo restringe (es `Int` libre); la validación es de servicio (ver `03-backend.md`).
2. Unicidad `(userId, dayOfWeek)`: el swap **no** puede hacer dos `update` directos de `dayOfWeek` (A→B, B→A) porque el segundo violaría el `@@unique` tras el primero. Exige slot temporal (`dayOfWeek = -1`, fuera del rango válido y por tanto invisible para `getRoutineDays` ordenado) dentro de la misma transacción, o bien swap por `dayId` de ejercicios con staging. La estrategia elegida se detalla en `03-backend.md` (recomendada: intercambio de `dayOfWeek` + `name` con slot `-1`).
3. Unicidad `(dayId, exerciseId)`: es la razón por la que el código actual lanza `BadRequest` ante duplicados y por la que el swap **no debe mover filas `RoutineExercise` una por una** sin staging. La estrategia recomendada evita tocar `RoutineExercise` por completo.
4. `sortOrder` denso `0..n-1` por día: el código actual de append conserva `sortOrder` del origen al mover, lo que produce huecos/colisiones en el destino. Tras el swap, cada día debe conservar su secuencia original intacta (al no mover ejercicios, se cumple por construcción). Si se eligiera la estrategia alternativa (mover ejercicios), habría que renumerar.
5. Borrado en cascada: `RoutineDay.exercises` tiene `onDelete: Cascade`, por lo que `deleteRoutineDay` solo necesita `delete` del `RoutineDay`; los `RoutineExercise` se borran por cascada. `PerformanceRecord` **no** tiene cascada desde rutina y no debe tocarse.

## API

Sin cambios en esta capa (ver `02-api.md`).

## Backend

Sin cambios en esta capa (ver `03-backend.md`).

## Frontend

Sin cambios en esta capa (ver `04-frontend.md`).

## Tests

- [ ] `npx prisma validate` pasa sin modificar `schema.prisma`
- [ ] `npx prisma migrate status` no reporta migración pendiente ni drift
- [ ] (Manual, una vez) inspección en DB de staging: tras un swap, no existen dos `RoutineDay` del mismo `userId` con igual `dayOfWeek`, ni `RoutineExercise` huérfanos (`dayId` sin `RoutineDay`)

## Criterios de Aceptación

- [ ] `schema.prisma` queda intacto (diff vacío) al final de las tres piezas
- [ ] Las invariantes 1–5 están referenciadas desde `03-backend.md` y cubiertas en `05-tests.md`
