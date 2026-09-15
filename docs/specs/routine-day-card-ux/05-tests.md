# Mejora tarjeta rutina-día — 05-tests

## Objetivo
Verificar los 4 cambios sin regresión, con énfasis en update optimista + rollback, formato único de marca y accesibilidad.

## Dependencias
- `04-frontend.md` implementado (los tests corren contra `apps/mobile/app/(app)/routine/[day].tsx` refactorizado).

## Unitarios (vitest — `apps/mobile`, ya configurado en `package.json`)
1. `formatPerformance` (Spec C) — extraer a helper testeable o testear inline:
   - `KG {value: 60}` → `"60 kg"`; `{value: 0}` → `"0 kg"` (no `Sin marca`)
   - `REPS_AND_WEIGHT {reps: 10, weight: 60}` → `"10 reps × 60 kg"`
   - `REPS_AND_WEIGHT {reps: 10, weight: null}` → `"10 reps"` (sin `× undefined`)
   - `perf null` → `"—"` y la tarjeta muestra `Sin marca`
   - Las 6 unidades (`KG/REPS/REPS_AND_WEIGHT/MIN/SEC/M`) pasan la regla "unidad aparece 1 vez": ` occurrences(unit) === 1` sobre el string renderizado.
2. `handleMove` puro (extraer `buildNewOrder(ids, index, dir)`):
   - `[a,b,c] move(0,+1)` → `[b,a,c]`; `move(0,-1)` → `[a,b,c]` (no-op); `move(2,+1)` → no-op.
3. Contraste (si existe util de tema): `primary` sobre `#1A1A1A` y `error` sobre `surface` ≥ 4.5:1 en light/dark.

## Integración (Apollo `MockedProvider` + `react-test-renderer`)
4. Reorder optimista éxito: mock `ROUTINE_DAY_QUERY` (3 ejercicios) + `REORDER_EXERCISES_MUTATION` con delay 500 ms → tap ▼ en índice 0 → el orden en pantalla cambia **antes** de resolver la mutation; tras resolver, `pull-to-refresh` mantiene el orden.
5. Reorder rollback: mock con `error: new Error('Network')` → tap ▲ → orden cambia y **revierte** + `showErrorToast` llamado (mock `apps/mobile/src/lib/toast`).
6. Doble-tap: dos taps rápidos en ▼ con `reordering=true` tras el primero → una sola llamada a la mutation (`toHaveBeenCalledTimes(1)`).
7. Quitar con confirmación: tap `Quitar` → `ConfirmModal` visible → Cancelar → `REMOVE_EXERCISE...` no llamada; Confirmar → llamada con `{ dayOfWeek, exerciseId }`.
8. Actualizar marca: tap `Editar` → `handleOpenEditMark` con `{ exerciseId, unit, currentPerf }` correcto por unidad (`KG` vs `REPS_AND_WEIGHT` con doble input kg/lb).

## E2E / manual (Expo Go o dev-client, iOS + Android)
9. Sin numeración: abrir rutina con 1, 5 y 20 ejercicios → ningún `#N` visible; rotar a landscape sin overlap.
10. Animación percibida: con throttling de red (devtools 2 s), mover arriba/abajo se siente instantáneo y suave; grabar video antes/después para la PR.
11. No-redundancia: crear/marcar ejercicios en las 6 unidades → cada tarjeta con una sola mención de unidad; caso `REPS_AND_WEIGHT` legible (`10 reps × 60 kg`).
12. Jerarquía: test de "tap erróneo" — 5 usuarios intentan editar y quitar; 0 eliminaciones accidentales; `Quitar` siempre pide confirmación.
13. Regresión completa: agregar ejercicio (tabs `groups/create`), editar marca kg↔lb (`syncKgToLb/syncLbToKg` intactos), `Mover día`, renombrar día, `EmptyState` con 0 ejercicios, pull-to-refresh.

## Accesibilidad (obligatorio)
14. Screen-reader (TalkBack/VoiceOver): foco recorre `Mover {nombre} arriba → abajo → Actualizar marca de {nombre} → Quitar {nombre}`; flechas de borde anuncian `deshabilitado`.
15. Targets: flechas ≥ 44×44, Editar 92×48 (verificar con `show layout bounds` / Accessibility Scanner); `hitSlop` efectivo.
16. Texto grande (fontScale 1.3) + dark mode: sin truncado de `Marca actual: 10 reps × 60 kg` ni solape con columna de botones.

## Criterios de Aceptación
- [ ] `npm test -- --run` (vitest) en `apps/mobile` pasa, incluyendo los nuevos casos 1-3
- [ ] Casos 4-8 de integración pasan en CI (o documentados como manual si no hay harness de `MockedProvider`)
- [ ] Checklist manual 9-16 firmado en la PR con videos/screenshots light + dark, iOS + Android
- [ ] `tsc --noEmit` y `eslint apps/mobile/app/\(app\)/routine/\[day\].tsx` sin errores nuevos
