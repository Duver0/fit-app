# Mejora tarjeta rutina-día — 03-backend

## Objetivo
Dejar constancia de que NO hay lógica de negocio nueva. Documentar supuestos de concurrencia que el frontend debe tolerar.

## Dependencias
- `01-database.md` y `02-api.md` verificados (sin cambios).

## Database
- N/A.

## API
- N/A (firma congelada — ver `02-api.md`).

## Backend
- **Sin cambios.** El servicio/resolver de `reorderExercises` ya valida pertenencia al usuario y persiste `sortOrder` según el índice del array `exerciseIds`.
- Supuestos que el frontend NO debe romper:
  1. El backend **sobrescribe** el orden completo (operación no atómica por pares): enviar siempre el array completo `exerciseIds` en el nuevo orden, nunca solo `(from, to)`.
  2. No hay lock optimista por versión: dos reorders concurrentes = last-write-wins. El frontend debe deshabilitar flechas mientras `reordering === true` (ya existe `disabled={... || reordering}` en 650/668 — mantener).
  3. `refetchQueries: [{ query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } }]` actual (líneas 147-149) se mantiene como **reconciliación final**, pero el feedback inmediato debe ser optimista (ver Spec B). No eliminar el `refetch`/`onError` con `showErrorToast`.
- Validaciones que ya deben existir en backend (no implementar aquí, solo no asumir de más): `dayOfWeek` en 0..6, `exerciseIds` sin duplicados y pertenecientes al día, usuario dueño de la rutina.

## Frontend
- Ver `04-frontend.md`.

## Tests
- Ver `05-tests.md` (el rollback optimista cubre el caso de error de backend).

## Criterios de Aceptación
- [ ] Cero diff en `api/` para esta feature
- [ ] Reorder con array completo sigue persistiendo correctamente (verificación manual contra backend existente)
- [ ] Doble-tap rápido en flechas no corrompe el orden (botones deshabilitados durante `reordering`)
