# Acciones de día de rutina — 05-tests

## Objetivo

Verificar el swap real, el delete nuevo y el kebab por capa, reescribiendo los tests del append y agregando cobertura del comportamiento normativo de `02-api.md` / `03-backend.md` / `04-frontend.md`.

## Dependencias

- `03-backend.md` implementado (unitarios e integración bloquean sin él).
- `04-frontend.md` implementado (E2E y accesibilidad bloquean sin él).

## Database

- [ ] `npx prisma validate` y `migrate status` limpios (ver `01-database.md`).

## API

- [ ] Introspección del schema generado contiene `deleteRoutineDay(dayOfWeek: Int!): Boolean!` y `swapRoutineDays` sin cambio de firma.
- [ ] Llamadas manuales (GraphQL playground contra dev, usuario de prueba con 2 días ocupados):
  - swap A↔B devuelve el día destino con los ejercicios de A y `MyRoutineDays` muestra ambos intercambiados.
  - `deleteRoutineDay` devuelve `true` y `routineDay(dayOfWeek)` posterior devuelve `null`.

## Backend

Archivo: `apps/api/src/modules/routines/routines.service.spec.ts`. El bloque `swapRoutineDays` (655–736) describe el append y **se reescribe**; los mocks deben agregarse: `routineDay.delete`, y `$transaction` interactiva (callback con `tx`).

Casos normativos `swapRoutineDays` (todos con `findUnique` de origen + destino + `performanceRecord.findUnique` para el `getRoutineDay` final):

1. `mismo día` → `BadRequestException` (existe; conservar).
2. `dayOfWeek` fuera de `0..6` (cualquiera de los dos, ej. `-1`, `7`) → `BadRequestException('dayOfWeek must be between 0 and 6')`.
3. Origen inexistente (`findUnique` → `null`) → `NotFoundException` (existe; conservar).
4. Origen sin ejercicios (`exercises: []`) → `NotFoundException` (existe; conservar).
5. **Destino vacío inexistente** → `update` del origen a `toDayOfWeek` dentro de `$transaction`; `routineDay.delete` no llamado; retorno `getRoutineDay(to)`.
6. **Destino existe pero vacío** → `delete` del destino + `update` del origen, ambos en la misma `$transaction`; no quedan rows huérfanos.
7. **Swap real ambos ocupados** (nuevo, el caso del bug): origen A `[e1(sort0), e2(sort1)]`, destino B `[e3(sort0)]` → verifica secuencia de `tx.routineDay.update`: `(A → -1)`, `(B → from)`, `(A → to)`; `routineExercise.update/updateMany` **nunca** llamado; `getRoutineDay(to)` con ejercicios de A.
8. **Swap con `exerciseId` común** (nuevo, regresión del parche eliminado): A `[e1]`, B `[e1]` → swap exitoso, sin `BadRequest` de duplicados.
9. **Nombres viajan con el contenido**: A `name: 'Pecho'` ↔ B `name: 'Pierna'` → tras el swap los `update` conservan cada `name` en su fila (assert sobre los args de `tx.update` o sobre `getRoutineDay` final según mock).
10. `$transaction` usada en todos los caminos de escritura (assert `prisma.$transaction` llamado; camino de error previo a escritura no la llama).

Casos normativos `deleteRoutineDay` (bloque nuevo):

1. Día con ejercicios → `routineDay.delete({ where: { id } })` llamado, retorna `true`.
2. Día inexistente → `NotFoundException`.
3. Día existe pero vacío → `NotFoundException` (decisión `03-backend.md`).
4. `dayOfWeek` fuera de rango → `BadRequestException` (y `delete` nunca llamado).
5. Scope por usuario: `findUnique` llamado con `where: { userId_dayOfWeek: { userId, dayOfWeek } }` (no hay camino que opere solo por `id` sin `userId` salvo el `delete` por `id` ya resuelto desde el lookup scoped).

## Frontend

Unitarios (Jest + Testing Library RN, donde exista harness; si no, E2E como cobertura mínima):

- [ ] Kebab renderiza `accessibilityLabel="Más acciones del día"`; al presionarlo aparece el sheet con las 3 opciones y labels con `{dayName}`.
- [ ] Con `exercises = []`: Mover/Eliminar deshabilitados u ocultos; Agregar habilitado.
- [ ] `handleDeleteDay`: mock de `DELETE_ROUTINE_DAY_MUTATION` resuelve `true` → `router.replace('/(app)/routine')` llamado; rechaza → `showErrorToast` y sin navegación.
- [ ] `handleMoveDay` tras éxito → `router.replace('/(app)/routine/${to}')` y `refetchQueries` incluye ambos `ROUTINE_DAY_QUERY` + `MyRoutineDays`.

Integración / E2E (Detox/Maestro o recorrido manual guionado si no hay harness):

1. Día A con 2 ejercicios, día B con 1 → kebab → Mover → B → confirmar → ver B con los 2 de A y A con el 1 de B (vía navegación al destino + pull-to-refresh + grilla `routine/index.tsx` con conteos).
2. Mover a día vacío → destino con ejercicios + nombre heredado; origen desaparece de la grilla (conteo 0 / "Sin ejercicios").
3. Eliminar día con N ejercicios → `ConfirmModal` muestra `"N ejercicio(s)"` + nota de marcas → Eliminar → toast `Día eliminado` → grilla con el día en "Sin ejercicios".
4. Cancelar el `ConfirmModal` → sin mutación en red (assert en mock o en log de red) y sin navegación.
5. Regresión append: repetir caso 1 y verificar que el destino **no** contiene la unión (conteo exacto, no suma).

Accesibilidad:

- [ ] Recorrido completo con TalkBack (Android) y VoiceOver (iOS): kebab → opciones → sheets → confirmación, todo anunciado con los labels del punto 5 de `04-frontend.md`.
- [ ] Targets táctiles ≥ 44×44 (kebab, opciones, pills de día, CTA) medidos en inspector.
- [ ] Contraste del label destructivo (`colors.error` sobre `colors.surface`) en light + dark mode.

## Tests

(Ver secciones por capa arriba; esta sección es el checklist de salida.)

- [ ] `npm test -- routines.service.spec` en `apps/api` en verde con los 10 + 5 casos backend.
- [ ] Grep de código muerto en verde: `Some exercises already exist` (0 resultados), `Modal visible={showMoveDay}` (0 resultados), fila `Mover día` suelta (0 resultados fuera de specs).
- [ ] E2E 1–5 + accesibilidad completados y registrados (video o notas de sesión si el harness es manual).

## Criterios de Aceptación

- [ ] Ningún test del append sobrevive: el bloque `swapRoutineDays` 655–736 fue reescrito y el caso "mover a destino vacío" coexiste con el caso "swap ambos ocupados"
- [ ] Cobertura de la regresión central: swap con ejercicios en ambos lados y con `exerciseId` común, sin error de duplicados y sin append
- [ ] `deleteRoutineDay` cubierto en sus 5 casos backend + flujo mobile completo (confirmar/cancelar)
- [ ] Kebab + sheets + confirmación verificados con screen-reader en ambas plataformas
