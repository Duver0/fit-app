# Mejora tarjeta rutina-día — 02-api

## Objetivo
Reutilizar los contratos GraphQL existentes sin agregar queries/mutations. Documentar qué operaciones usa `04-frontend.md` para el update optimista.

## Dependencias
- `01-database.md` debe estar verificado (sin cambios) antes.

## Database
- N/A.

## API
- **Sin cambios.** Contratos reutilizados (definidos en `apps/mobile/src/lib/graphql.ts`):
  - `ROUTINE_DAY_QUERY(dayOfWeek: Int!)` → `routineDay { id name exercises { id sortOrder exercise { id name unit } myPerformance { ... } group { ... } } }`. Ya trae `sortOrder` — no agregar campos.
  - `REORDER_EXERCISES_MUTATION(dayOfWeek: Int!, exerciseIds: [String!]!)` — ya existe, usada en líneas 144-152. No cambiar firma.
  - `REMOVE_EXERCISE_FROM_DAY_MUTATION`, `UPSERT_PERFORMANCE_MUTATION` — sin cambios.
- **Prohibido** en esta spec: agregar subscriptions de reorder, paginación nueva, o campos `position`/`index` duplicados de `sortOrder`.
- Nota para el update optimista: el implementador debe usar `cache.modify` / `optimisticResponse` con la **misma firma** existente. Ejemplo de `optimisticResponse` permitido:
  ```ts
  reorderExercises({
    variables: { dayOfWeek, exerciseIds: newOrderIds },
    optimisticResponse: {
      reorderExercises: newOrderIds.map((id, i) => ({ __typename: 'RoutineDayExercise', id, sortOrder: i })),
    },
  })
  ```
  (Ajustar `__typename` al schema real del backend; si `reorderExercises` retorna `Boolean`, usar `update`/`cache.modify` sobre `ROUTINE_DAY_QUERY` en su lugar — ver `04-frontend.md` Spec B.)

## Backend
- N/A.

## Frontend
- Ver `04-frontend.md` Spec B para el uso concreto.

## Tests
- Ver `05-tests.md` (mock de `REORDER_EXERCISES_MUTATION` con éxito/error).

## Criterios de Aceptación
- [ ] No se modifica `apps/mobile/src/lib/graphql.ts` (cero diff) salvo tipos TS locales si hiciera falta
- [ ] `REORDER_EXERCISES_MUTATION` sigue aceptando `(dayOfWeek, exerciseIds)` ordenados por `sortOrder` ascendente
- [ ] El orden devuelto por `ROUTINE_DAY_QUERY` tras reorder coincide con `exerciseIds` enviado
