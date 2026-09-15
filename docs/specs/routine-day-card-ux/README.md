# Mejora tarjeta de ejercicios del día en rutina

## Descripción
Mejorar la vista `apps/mobile/app/(app)/routine/[day].tsx` (1433 líneas) para que la tarjeta de cada ejercicio sea más clara, rápida y accesible. El usuario reporta 4 problemas concretos: numeración técnica visible (`#sortOrder`), reorder sin feedback visual, redundancia en la indicación de unidad/marca, y jerarquía incorrecta entre "Actualizar marca" (frecuente) y "Quitar" (destructivo/infrecuente).

Esta spec NO agrega features nuevas ni cambia el modelo de datos. Es refactor UI + UX + update optimista, confinado a un solo archivo de pantalla.

## Archivos afectados (única fuente de verdad)
- `apps/mobile/app/(app)/routine/[day].tsx` — líneas 50-97 (`UNIT_LABELS`, `formatPerformance`), 272-286 (`handleMoveUp/Down`), 647-684 (flechas 32×32), 687-702 (badge unidad + `Marca:`), 704-744 (botones Editar/Quitar), 747-756 (badge `#sortOrder` absoluto).
- `apps/mobile/babel.config.js` — sin plugin de Reanimated (decisión clave para animación).
- `apps/mobile/package.json` — `react-native-reanimated@~3.6.0` instalado pero **no habilitado**; `react: 18.2.0`, `react-native: 0.73.0`, Expo SDK ~50.
- Referencia visual: `apps/mobile/src/components/ui/*` (`Skeleton`, `ErrorState`, `EmptyState`, `ConfirmModal`) — no se modifican, solo se reutilizan.

## Dependencias externas
- Auth0: no
- R2 Storage: no
- FCM: no

## Orden de implementación
1. `01-database.md` — sin cambios (verificación de que `sortOrder` ya existe)
2. `02-api.md` — sin cambios (reuso de `REORDER_EXERCISES_MUTATION` existente)
3. `03-backend.md` — sin cambios (reuso de reorder existente + notas de concurrencia)
4. `04-frontend.md` — **implementación real**: 4 sub-specs (A: quitar numeración, B: animación reorder + optimista, C: formato marca único, D: jerarquía Editar/Quitar + accesibilidad)
5. `05-tests.md` — verificación (unitarias, integración, E2E, accesibilidad)

## Notas
- Restricción de animación: usar **solo `Animated` nativo** (`Animated.timing`, `LayoutAnimation` con `UIManager.setLayoutAnimationEnabledExperimental` en Android). NO habilitar Reanimated salvo que se agregue `react-native-reanimated/plugin` a `babel.config.js` + rebuild de dev-client — eso queda fuera de alcance y se documenta como riesgo en `04-frontend.md`.
- `FlatList` actual usa `keyExtractor={(item) => item.id}` y `refetchQueries` tras cada reorder → causa salto visual. El update optimista debe escribir en caché Apollo, no solo `setState` local, para no romper `pull-to-refresh`.
- Accesibilidad mínima: cada acción con `accessibilityRole`, `accessibilityLabel` con nombre del ejercicio (ej. `"Mover Press banca arriba"`), `hitSlop ≥ 8`, target táctil ≥ 44×44 (las flechas actuales de 32×32 **violan** esto).
- Mantener `ConfirmModal` para Quitar. No cambiar flujo de `showEditMark` / `UPSERT_PERFORMANCE_MUTATION`.
- Idioma UI: español rioplatense existente (`Marca:`, `Quitar`, `Actualizar marca`). No introducir inglés en labels.

## Criterios de aceptación globales
- [ ] No se renderiza ningún texto `#0`, `#1`, `#2` ni `sortOrder` en la tarjeta
- [ ] Mover arriba/abajo reordena visualmente en < 200 ms (optimista) y persiste en servidor; ante error hace rollback + toast
- [ ] La unidad aparece **una sola vez** por tarjeta (ver regla en `04-frontend.md` Spec C)
- [ ] `Actualizar marca` es visualmente dominante y está separado de `Quitar`; `Quitar` exige confirmación
- [ ] Sin regresión: agregar/quitar ejercicio, editar marca, pull-to-refresh, `Mover día`, modal agregar, siguen funcionando
- [ ] `tsc --noEmit` y `eslint` pasan en `apps/mobile`
