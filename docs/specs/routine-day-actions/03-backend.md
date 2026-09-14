# Acciones de día de rutina — 03-backend

## Objetivo

Reescribir `RoutinesService.swapRoutineDays` como swap atómico real e implementar `RoutinesService.deleteRoutineDay`, con validaciones, manejo de nombres y errores según `02-api.md`.

## Dependencias

- `02-api.md` debe estar aprobado (contratos y tabla de comportamiento fijados).

## Database

Sin migración (ver `01-database.md`). El servicio opera sobre `routineDay` / `routineExercise` con las invariantes de unicidad allí descritas.

## API

Resolver (`routines.resolver.ts`): agregar

```ts
@Mutation(() => Boolean)
async deleteRoutineDay(
  @CurrentUser() user: User,
  @Args('dayOfWeek', { type: () => Int }) dayOfWeek: number,
) {
  return this.routinesService.deleteRoutineDay(user.id, dayOfWeek)
}
// swapRoutineDays: sin cambios en el resolver.
```

## Backend

Archivo: `apps/api/src/modules/routines/routines.service.ts`.

### 0. Helper compartido (nuevo, privado)

```ts
private assertDayOfWeek(n: number) {
  if (!Number.isInteger(n) || n < 0 || n > 6)
    throw new BadRequestException('dayOfWeek must be between 0 and 6')
}
```

Se usa al inicio de `swapRoutineDays` (ambos args) y `deleteRoutineDay`.

### 1. `swapRoutineDays` reescrito — estrategia elegida: intercambio de slot (`dayOfWeek` + `name`)

**Por qué no mover ejercicios.** Mover filas `RoutineExercise` choca con `@@unique([dayId, exerciseId])` cuando ambos días comparten un `exerciseId` (ej. Press banca lunes y miércoles): el `updateMany` actual o bien falla (parche `BadRequest` de duplicados) o bien, sin parche, violaría el unique. Requiere staging con día temporal + renumeración. En cambio, **intercambiar los slots** (`dayOfWeek`, `name`) entre los dos rows `RoutineDay` no toca `RoutineExercise` en absoluto: cada ejercicio conserva su `dayId`, su `sortOrder` y su `id`; no hay colisión posible; es O(1) y preserva el orden relativo de cada día por construcción.

**Problema del unique `(userId, dayOfWeek)` y su resolución.** El intercambio directo (A→B, B→A) viola el `@@unique` a mitad de camino. Solución normativa: transacción interactiva con slot temporal `-1` (fuera del rango válido, invisible para `getRoutineDays` que ordena por `dayOfWeek asc` y para el mobile que mapea 0–6):

```ts
async swapRoutineDays(userId: string, fromDayOfWeek: number, toDayOfWeek: number) {
  this.assertDayOfWeek(fromDayOfWeek)
  this.assertDayOfWeek(toDayOfWeek)
  if (fromDayOfWeek === toDayOfWeek)
    throw new BadRequestException('Cannot move routine to the same day')

  const source = await this.prisma.routineDay.findUnique({
    where: { userId_dayOfWeek: { userId, dayOfWeek: fromDayOfWeek } },
    include: { exercises: true },
  })
  if (!source || source.exercises.length === 0)
    throw new NotFoundException('Source day has no exercises to move')

  const target = await this.prisma.routineDay.findUnique({
    where: { userId_dayOfWeek: { userId, dayOfWeek: toDayOfWeek } },
    include: { exercises: true },
  })
  const targetHasContent = !!target && target.exercises.length > 0

  if (!targetHasContent) {
    // — Move simple (destino inexistente o vacío) —
    // Reutiliza el intercambio de slot: si el target row existe pero está
    // vacío, se elimina primero para no dejar rows huérfanos.
    await this.prisma.$transaction(async (tx) => {
      if (target) await tx.routineDay.delete({ where: { id: target.id } })
      await tx.routineDay.update({
        where: { id: source.id },
        data: { dayOfWeek: toDayOfWeek }, // el name viaja con el contenido
      })
    })
    return this.getRoutineDay(userId, toDayOfWeek)
  }

  // — Swap real A↔B (ambos con contenido): dayOfWeek + name viajan juntos —
  await this.prisma.$transaction(async (tx) => {
    await tx.routineDay.update({ where: { id: source.id }, data: { dayOfWeek: -1 } })
    await tx.routineDay.update({ where: { id: target!.id }, data: { dayOfWeek: fromDayOfWeek } })
    await tx.routineDay.update({ where: { id: source.id }, data: { dayOfWeek: toDayOfWeek } })
    // Los names NO se tocan: al estar en la misma fila que los ejercicios,
    // viajan con el contenido automáticamente. (Si el producto decidiera que
    // el name pertenece al slot semanal y no al contenido, intercambiar
    // `name` explícitamente aquí; la decisión vigente es contenido.)
  })
  return this.getRoutineDay(userId, toDayOfWeek)
}
```

Notas normativas:

- **Nombres:** el `name` vive en la fila `RoutineDay`; al mover la fila completa, el nombre viaja con los ejercicios. Ejemplo: Lunes "Pecho" ↔ Miércoles "Pierna" → tras el swap, Miércoles se llama "Pecho" con los ejercicios de pecho. En move simple, el destino hereda el nombre del origen. Si el destino vacío tenía un `name` huérfano (row sin ejercicios), se descarta al eliminar ese row — comportamiento deseado (no perpetuar nombres de días vacíos).
- **`updateDayName` / `reorderExercises` no cambian.** El swap no renumera `sortOrder` (cada día conserva su secuencia).
- **Eliminar código muerto:** borrar el bloque de detección de duplicados (líneas 273–287 actuales) y el `updateMany` + `deleteMany` (289–298 actuales). El `deleteMany` con `where: { id, userId }` además era riesgoso (borrado amplio); la nueva versión usa `delete` por `id` dentro de transacción.
- **Concurrencia:** dos swaps concurrentes sobre el mismo usuario pueden colisionar en el slot `-1` (`P2002`). Se acepta el error de Prisma como fallo con reintento desde el cliente (toast + refetch); no se implementa lock pesimista en esta spec.
- **Logging:** mantener el `Logger` del servicio; `warn` si `target` era row vacío eliminado en move simple (higiene de datos).

### 2. `deleteRoutineDay` (nuevo)

```ts
async deleteRoutineDay(userId: string, dayOfWeek: number): Promise<boolean> {
  this.assertDayOfWeek(dayOfWeek)
  const day = await this.prisma.routineDay.findUnique({
    where: { userId_dayOfWeek: { userId, dayOfWeek } },
    include: { exercises: { select: { id: true } } },
  })
  if (!day || day.exercises.length === 0)
    throw new NotFoundException('Routine day not found')
  // Cascada de RoutineExercise por onDelete: Cascade; PerformanceRecord intactos.
  await this.prisma.routineDay.delete({ where: { id: day.id } })
  return true
}
```

- Row vacío (existe pero sin ejercicios): se trata como `NOT_FOUND`. Justificación: el mobile representa "día vacío" por ausencia (`dayMap[dayOfWeek]` undefined en `routine/index.tsx` 69–72); un row vacío es un estado transitorio/huérfano y borrarlo por esta vía confundiría el conteo. Si el implementador detecta rows vacíos huérfanos en producción, puede limpiarlos con el mismo `delete` pero fuera de esta mutación.
- Sin transacción necesaria (una sola escritura). Sin `deleteMany`.

## Frontend

No aplica en esta capa (ver `04-frontend.md`).

## Tests

Ver `05-tests.md` (casos normativos de `swapRoutineDays` + `deleteRoutineDay`, incluyendo reescritura del bloque 655–736 de `routines.service.spec.ts`).

## Criterios de Aceptación

- [ ] `swapRoutineDays` con A=[e1,e2] y B=[e3] deja A=[e3] y B=[e1,e2], con `sortOrder` y `name` de cada contenido intactos, en una sola transacción
- [ ] `swapRoutineDays` con mismo `exerciseId` en ambos días **no** lanza `BadRequest` de duplicados e intercambia igual
- [ ] `swapRoutineDays` a destino vacío mueve contenido + nombre y no deja row origen; a destino inexistente lo crea implícitamente (vía `update` del slot)
- [ ] `from == to`, `dayOfWeek` fuera de `0..6`, origen vacío/inexistente → errores según `02-api.md`
- [ ] `deleteRoutineDay` borra el row + cascada de ejercicios, conserva `PerformanceRecord`, retorna `true`; día inexistente/vacío → `NOT_FOUND`
- [ ] No queda rastro de `updateMany({ data: { dayId } })` ni del mensaje `"Some exercises already exist"` en `routines.service.ts`
- [ ] `routines.service.spec.ts` reescrito en verde (mocks de `$transaction` interactiva)
