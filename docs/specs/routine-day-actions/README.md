# Acciones de día de rutina: kebab ⋮ + fix swap + eliminar día

## Descripción

Tres piezas relacionadas sobre el día de rutina (`RoutineDay`, `dayOfWeek` 0–6):

- **A. Menú kebab (⋮) en `[day].tsx`.** Hoy `Mover día` es un botón suelto en una fila secundaria visible solo si `exercises.length > 0` (`apps/mobile/app/(app)/routine/[day].tsx` 731–758) y abre un `Modal` manual (997–1081). El CTA `Agregar` es un pill en el header custom (710–728). Se pide agrupar en un kebab: **Agregar ejercicio · Mover día · Eliminar día** (nueva), con iconos, accesibilidad y reutilización de `BottomSheetModal` / `ConfirmModal`, siguiendo el patrón del menú de `apps/mobile/app/(app)/groups/[groupId]/index.tsx` 394–434 pero migrado al componente reutilizable.
- **B. Bug swap.** `apps/api/src/modules/routines/routines.service.ts` 252–301 (`swapRoutineDays`) hace **append**: `updateMany({ where: { dayId: source }, data: { dayId: target } })` conservando `sortOrder`, y borra el día origen. Si ambos días tienen ejercicios, el destino termina con la suma (o falla con `BadRequest` si hay `exerciseId` duplicado). Debe ser un **swap real**: ambos contenidos intercambian su lugar, atómico, sin sumarse.
- **C. Nueva mutación eliminar día** (`deleteRoutineDay` / `clearDay`): backend + mobile + confirmación destructiva. Hoy no existe; solo se puede quitar ejercicio por ejercicio (`removeExerciseFromDay`).

Solo specs, no código. Orden estricto **backend primero**: el kebab (mobile) consume el swap corregido y la mutación nueva; no se implementa UI que llame a un contrato inexistente.

## Archivos afectados (única fuente de verdad)

- `apps/mobile/app/(app)/routine/[day].tsx` — header custom 685–729, fila Mover 731–758, modal MoveDay manual 997–1081, `swapRoutineDays` hook 271–275, `handleMoveDay` 444–458, `ConfirmModal` quitar-ejercicio 1388–1397, `BottomSheetModal` EditMark 1400–1596 (patrón a reutilizar).
- `apps/mobile/app/(app)/routine/index.tsx` — grilla de 7 días 98–165, `dayMap` 69–72, navegación `router.push('/(app)/routine/${dayOfWeek}')` 109. **Sin kebab** (decisión en `04-frontend.md`).
- `apps/mobile/app/(app)/groups/[groupId]/index.tsx` 394–434 — patrón de referencia del dropdown (`ScreenHeader rightAction` + `Modal` + `Pressable`), a **reemplazar** por `BottomSheetModal` en rutina.
- `apps/mobile/src/components/ui/ScreenHeader.tsx` — soporta `rightAction`; el header de `[day].tsx` es custom y no lo usa (ver decisión en `04-frontend.md`).
- `apps/mobile/src/components/ui/BottomSheetModal.tsx` — sheet reutilizable (backdrop, `maxHeightPercent`, `avoidKeyboard`, `scrollable`).
- `apps/mobile/src/components/ui/ConfirmModal.tsx` — diálogo centrado con `confirmDestructive`.
- `apps/mobile/src/lib/graphql.ts` — `ROUTINE_DAY_QUERY` 614, `MY_ROUTINE_DAYS_QUERY` 587, `SWAP_ROUTINE_DAYS_MUTATION` 727. Aquí se agregan `DELETE_ROUTINE_DAY_MUTATION` y se documenta el contrato corregido de `SWAP`.
- `apps/api/src/modules/routines/routines.service.ts` — `swapRoutineDays` 252–301 (bug), `removeExerciseFromDay` 193–215 (referencia de errores), `reorderExercises` 217–236 (referencia de `$transaction`), `updateDayName` 238–250.
- `apps/api/src/modules/routines/routines.resolver.ts` — `swapRoutineDays` 93–104 (contrato a mantener), resto de mutations 65–113 (patrón `GqlAuthGuard` + `CurrentUser`).
- `apps/api/src/modules/routines/dto/routine.input.ts` — inputs existentes (referencia; el delete usa scalar `dayOfWeek`, sin DTO nuevo).
- `apps/api/src/modules/routines/routines.service.spec.ts` — bloque `swapRoutineDays` 655–736 (tests actuales del comportamiento append: se reescriben).
- `apps/api/prisma/schema.prisma` — `RoutineDay` 40–53 (`@@unique([userId, dayOfWeek])`), `RoutineExercise` 55–67 (`@@unique([dayId, exerciseId])`, `@@index([dayId, sortOrder])`). Sin migración (ver `01-database.md`).

## Dependencias externas

- Auth0: no
- R2 Storage: no
- FCM: no

## Orden de implementación

1. `01-database.md` — verificación de esquema, invariantes y por qué no hay migración. **Sin bloqueos.**
2. `02-api.md` — contrato GraphQL: semántica corregida de `swapRoutineDays` (sin cambio de firma) + nueva `deleteRoutineDay(dayOfWeek: Int!): Boolean!`. Depende de `01-database.md`.
3. `03-backend.md` — `RoutinesService.swapRoutineDays` (swap atómico real) + `deleteRoutineDay` + validaciones y errores. Depende de `02-api.md`.
4. `04-frontend.md` — kebab ⋮ en `[day].tsx` (agrupa Agregar / Mover / Eliminar), migración del modal manual a `BottomSheetModal`, `ConfirmModal` destructivo para eliminar, wiring de mutations. Depende de `03-backend.md`.
5. `05-tests.md` — unitarios backend, integración, E2E mobile y accesibilidad. Depende de `03-backend.md` y `04-frontend.md`.

## Notas

- Idioma UI: español rioplatense existente (`Mover día`, `Agregar ejercicio`, `Quitar`). Nuevos labels en el mismo registro: `Eliminar día`, `Mover rutina a otro día`, `Esta acción no se puede deshacer`.
- Compatibilidad: la firma `swapRoutineDays(fromDayOfWeek: Int!, toDayOfWeek: Int!): RoutineDay!` **no cambia**; cambia la semántica (swap vs append) y se documenta como breaking-fix en `02-api.md`. Clientes viejos que esperaban append deben migrarse; no se versiona la API.
- Nombre propuesto para la mutación nueva: **`deleteRoutineDay`**. Alias `clearDay` queda descartado (ver `02-api.md`): "clear" sugiere vaciar dejando el row; la semántica elegida es borrar ejercicios + borrar el row.
- Las marcas (`PerformanceRecord`) **nunca** se borran: ni el swap ni el delete las tocan (consistente con el mensaje actual de `ConfirmModal` en `[day].tsx` 1391: "No se eliminará tu marca registrada").
- `routine/index.tsx` no lleva kebab: las 7 cards son navegación, no acciones sobre contenido. Evita acciones destructivas sin contexto del día abierto.

## Criterios de aceptación globales

- [ ] El botón suelto `Mover día` (731–758) y el `Modal` manual (997–1081) desaparecen de `[day].tsx`; toda acción de día vive en el kebab ⋮
- [ ] Swap con ambos días ocupados intercambia contenidos (A↔B), nunca suma; con destino vacío hace move simple; todo en transacción atómica
- [ ] Existe `deleteRoutineDay` en backend + mobile con confirmación destructiva y navegación de salida
- [ ] `tsc --noEmit` y `eslint` pasan en `apps/api` y `apps/mobile`; suite `routines.service.spec.ts` en verde
