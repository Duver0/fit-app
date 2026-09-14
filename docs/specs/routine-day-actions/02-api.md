# Acciones de día de rutina — 02-api

## Objetivo

Fijar los contratos GraphQL para el swap corregido y la mutación nueva, antes de tocar el servicio o el mobile.

## Dependencias

- `01-database.md` debe estar validado (sin migración, invariantes conocidas).

## Database

Sin cambios (ver `01-database.md`).

## API

Resolver: `apps/api/src/modules/routines/routines.resolver.ts` (guard `GqlAuthGuard` + `CurrentUser`, patrón de las mutations 65–113). Documento mobile: `apps/mobile/src/lib/graphql.ts`.

### 1. `swapRoutineDays` — misma firma, semántica corregida (breaking-fix documentado)

```graphql
# SIN CAMBIO de firma — solo cambia la semántica implementada
swapRoutineDays(fromDayOfWeek: Int!, toDayOfWeek: Int!): RoutineDay!
```

- Retorna el día **destino** (`toDayOfWeek`) con `exercises { ... sortOrder exercise { ... } group { ... } myPerformance { ... } }`, igual que hoy (`routines.resolver.ts` 93–104 → `getRoutineDay(userId, toDayOfWeek)`).
- No se introduce payload `{ from, to }` para no romper el documento `SWAP_ROUTINE_DAYS_MUTATION` (`graphql.ts` 727–745) ni sus `refetchQueries`. El mobile invalida **ambos** días + `MyRoutineDays` (ver `04-frontend.md`).
- Tabla de comportamiento normativo (el servicio la implementa, ver `03-backend.md`):

| Caso | Comportamiento |
|---|---|
| `from == to` | `BAD_REQUEST` `"Cannot move routine to the same day"` (se mantiene) |
| `from` o `to` fuera de `0..6` | `BAD_REQUEST` `"dayOfWeek must be between 0 and 6"` (**nuevo**) |
| Origen inexistente o sin ejercicios | `NOT_FOUND` `"Source day has no exercises to move"` (se mantiene) |
| Destino inexistente o vacío | **Move simple**: contenido de origen → destino, origen se elimina. Equivale al comportamiento actual pero en transacción |
| Ambos con ejercicios | **Swap real A↔B**: los dos contenidos intercambian su lugar. Nunca append. Nunca error por duplicados (desaparece el `BadRequest` `"Some exercises already exist in the target day"`) |
| Nombres personalizados | Se mueven **con el contenido** (el `name` de A pasa a B y viceversa; en move simple, el `name` de origen pasa al destino) |

- Error que **se elimina**: `BadRequestException('Some exercises already exist in the target day')` (`routines.service.ts` 282–286). Era un parche del append; con swap real no hay colisión posible (ver estrategia en `03-backend.md`).
- Nota de compatibilidad: clientes que dependían del append (destino = unión) verán un cambio de resultado ante el mismo llamado. Se asume un único cliente (esta app mobile) que se actualiza a la par. Sin versionado.

### 2. `deleteRoutineDay` — mutación nueva

Decisión de nombre: **`deleteRoutineDay`**. Se descarta `clearDay` porque "clear" sugiere vaciar dejando el `RoutineDay` huérfano; la semántica elegida borra ejercicios **y** el row (el día vuelve a "Sin ejercicios" en `routine/index.tsx` por ausencia, no por row vacío).

```graphql
deleteRoutineDay(dayOfWeek: Int!): Boolean!
```

- Args: `dayOfWeek: Int!` con la misma validación `0..6` (`BAD_REQUEST` si fuera de rango).
- Retorno `Boolean!`: `true` si se borró. Se elige escalar (y no `RoutineDay`) porque el día deja de existir; no hay objeto que retornar. El mobile navega atrás y hace `refetch` (ver `04-frontend.md`).
- Errores:
  - Día inexistente o ya vacío → `NOT_FOUND` `"Routine day not found"` (consistente con `removeExerciseFromDay`, `routines.service.ts` 199). Alternativa idempotente (`true` aunque no exista) queda **descartada**: ocultaría errores de `dayOfWeek` y rompería la simetría con el resto del módulo.
  - Sin autenticación → `UNAUTHORIZED` vía `GqlAuthGuard` (sin código nuevo).
- Alcance por usuario: siempre filtrado por `user.id` (`CurrentUser`); un usuario nunca puede borrar el día de otro (el `@@unique([userId, dayOfWeek])` lo hace estructural).
- Efectos colaterales normativos: borra `RoutineDay` + cascada de sus `RoutineExercise`. **No** borra `PerformanceRecord`, `Exercise`, ni `Group` (igual que `removeExerciseFromDay`).

### Documento mobile (`graphql.ts`)

```ts
export const DELETE_ROUTINE_DAY_MUTATION = gql`
  mutation DeleteRoutineDay($dayOfWeek: Int!) {
    deleteRoutineDay(dayOfWeek: $dayOfWeek)
  }
`
// SWAP_ROUTINE_DAYS_MUTATION: sin cambios de documento.
```

- DTO backend (`dto/routine.input.ts`): sin input nuevo; ambas mutations usan escalares `Int` vía `@Args`, igual que `swapRoutineDays` actual.

## Backend

Ver `03-backend.md` para la implementación de estos contratos.

## Frontend

Ver `04-frontend.md` para el consumo (kebab + wiring + navegación post-delete).

## Tests

Ver `05-tests.md` (contratos cubiertos por specs de servicio + E2E mobile).

## Criterios de Aceptación

- [ ] `swapRoutineDays` mantiene firma y tipo de retorno; su tabla de comportamiento está implementada tal cual en `03-backend.md`
- [ ] El error `"Some exercises already exist in the target day"` ya no existe en el codebase (grep vacío)
- [ ] `deleteRoutineDay(dayOfWeek: Int!): Boolean!` existe en schema generado, con guard de auth y scope por usuario
- [ ] `DELETE_ROUTINE_DAY_MUTATION` existe en `graphql.ts`; `SWAP_ROUTINE_DAYS_MUTATION` no cambia su documento
- [ ] `dayOfWeek` fuera de `0..6` → `BAD_REQUEST` en ambas mutations; origen vacío/inexistente → `NOT_FOUND`
