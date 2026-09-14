# Acciones de día de rutina — 04-frontend

## Objetivo

Agrupar todas las acciones del día en un menú kebab (⋮) en `[day].tsx`, migrar el modal manual de Mover a `BottomSheetModal`, agregar la opción Eliminar con `ConfirmModal` destructivo, y cablear las mutations con el swap corregido.

## Dependencias

- `03-backend.md` debe estar implementado y verificado (swap real + `deleteRoutineDay` disponibles). El mobile no se desarrolla contra mocks del contrato nuevo.

## Database

Sin cambios.

## API

- `apps/mobile/src/lib/graphql.ts`: agregar `DELETE_ROUTINE_DAY_MUTATION` (ver `02-api.md`); `SWAP_ROUTINE_DAYS_MUTATION` sin cambios de documento.
- Regla de invalidación (normativa para todos los handlers de esta spec):
  - Tras `swapRoutineDays`: `refetchQueries: [{ query: ROUTINE_DAY_QUERY, variables: { dayOfWeek: from } }, { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek: to } }, 'MyRoutineDays']` + navegación al día destino (el contenido del día actual se mudó).
  - Tras `deleteRoutineDay`: `refetchQueries: ['MyRoutineDays']` + `router.back()` / `router.replace('/(app)/routine')`.

## Backend

Sin cambios (ver `03-backend.md`).

## Frontend

Archivo principal: `apps/mobile/app/(app)/routine/[day].tsx`. Decisión explícita: `routine/index.tsx` **no** lleva kebab (sus 7 cards 98–165 son navegación con `router.push`; una acción destructiva allí carecería del contexto del día abierto y del conteo de ejercicios para confirmar).

### 1. Dónde va el kebab (propuesta concreta)

Header custom actual (685–729): `[←] [título editable flex:1] [pill Agregar]`. Propuesta normativa:

```
[←] [título editable flex:1] [pill Agregar] [⋮ kebab]
```

- **Se mantiene el pill `Agregar` visible** (acción frecuente; quitarlo del header para esconderlo en el menú empeoraría el flujo principal). El kebab agrupa el acceso **redundante** a Agregar (para descubribilidad / usuarios que buscan "⋮ → Agregar") + Mover + Eliminar.
- El kebab es un `TouchableOpacity` de 44×44 con `Ionicons name="ellipsis-vertical" size={22}`, a la derecha del pill, con `gap: 8` entre ambos.
- **Se elimina la fila secundaria** `Mover día` (731–758) por completo: era visible solo con ejercicios y ocupaba altura + duplicaba el punto de entrada.
- No migrar el header a `ScreenHeader`: el header de `[day].tsx` es custom (título editable inline 694–708) y `ScreenHeader` no soporta título editable. Solo se le suma el `rightAction`-equivalente manual (kebab) en el mismo `View` del header.

### 2. Opciones, iconos y estados

`BottomSheetModal` (ya importado, ver uso en EditMark 1400) con `visible={showKebab}`, `onClose`, `scrollable={false}`. Contenido: 3 filas `TouchableOpacity` de altura mínima 52, `flexDirection: row`, `gap: 12`, icono 22 + label 16:

| # | Opción | Icono | Acción | Visibilidad |
|---|---|---|---|---|
| 1 | `Agregar ejercicio` | `add-circle-outline` (`colors.primary`) | cierra kebab → `setShowAddModal(true)` | siempre |
| 2 | `Mover día…` | `swap-horizontal` (`colors.text`) | cierra kebab → abre sheet de destino (punto 3) | solo si `exercises.length > 0`; si vacío, fila deshabilitada con `opacity 0.4` + `accessibilityState={{ disabled: true }}` y subtítulo `"Agregá ejercicios primero"` |
| 3 | `Eliminar día` | `trash-outline` (`colors.error`) | cierra kebab → `setShowDeleteConfirm(true)` | solo si `exercises.length > 0` (si el día está vacío no hay nada que borrar; evita el `NOT_FOUND` del backend) |

Estados de error por fila: no hay; los errores de red se muestran con `showErrorToast` en los handlers (patrón existente 218, 258, 274).

### 3. Migración del modal Mover (997–1081 → `BottomSheetModal`)

El `Modal` manual con `animationType="slide"` y grilla de 7 días se **reescribe** dentro de `BottomSheetModal`:

- Estados existentes que se conservan: `showMoveDay`, `movingDayTo`, `movingDay`, `handleMoveDay` (444–458) con nueva invalidación + navegación (ver punto API).
- Contenido: título `Mover rutina a otro día`, subtítulo `Mover todos los ejercicios de {dayName} a:`, grilla 2 columnas de pills día (reutilizar el render 1024–1057 casi tal cual), día actual deshabilitado con icono `locate`, CTA `Mover rutina` deshabilitado hasta selección.
- Copy del toast de éxito: cambiar `'Rutina movida'` (274) por `'Día intercambiado'` cuando el destino tenía ejercicios y `'Rutina movida'` cuando estaba vacío. El mobile sabe si el destino tenía ejercicios vía `MY_ROUTINE_DAYS_QUERY` en caché (`dayMap`); si no puede determinarlo, usar siempre `'Rutina movida'`. (El backend no informa el caso en el payload actual.)
- Tras éxito: `setShowMoveDay(false); setMovingDayTo(null)` + `router.replace('/(app)/routine/${movingDayTo}')` (**nuevo**: el contenido se mudó; quedarse en el día origen vacío confunde).

### 4. Eliminar día (nuevo, destructivo)

```tsx
const [deleteRoutineDay, { loading: deletingDay }] = useMutation(
  DELETE_ROUTINE_DAY_MUTATION,
  {
    refetchQueries: ['MyRoutineDays'],
    onCompleted: () => showSuccessToast('Día eliminado'),
    onError: (e) => showErrorToast(e.message),
  },
)
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

const handleDeleteDay = async () => {
  try {
    await deleteRoutineDay({ variables: { dayOfWeek } })
    setShowDeleteConfirm(false)
    router.replace('/(app)/routine')
  } catch { /* onError ya muestra el toast */ }
}
```

- `ConfirmModal` (ya importado, patrón 1388–1397):
  - `title="Eliminar día"`, `message={`¿Eliminar ${dayName} con ${exercises.length} ejercicio(s)? Esta acción no se puede deshacer. Tus marcas registradas se conservan.`}`
  - `confirmLabel={deletingDay ? 'Eliminando…' : 'Eliminar'}` (deshabilitar doble-tap vía `loading`; `ConfirmModal` no tiene prop `loading`: envolver con guarda `if (deletingDay) return` al inicio del handler)
  - `confirmDestructive`, `cancelLabel="Cancelar"`, `onConfirm={handleDeleteDay}`, `onCancel={() => setShowDeleteConfirm(false)}`.
- El mensaje **debe** incluir el conteo y la aclaración de marcas (paridad con el `ConfirmModal` de quitar-ejercicio 1391).

### 5. Accesibilidad (normativa, sin excepciones)

- Kebab: `accessibilityRole="button"`, `accessibilityLabel="Más acciones del día"`, `accessibilityHint="Abre el menú con Agregar, Mover y Eliminar"`, `hitSlop ≥ 8`, target 44×44.
- Cada opción: `accessibilityRole="menuitem"` (o `"button"` si el tester con screen-reader lo exige en la revisión), labels con nombre del día: `"Agregar ejercicio a {dayName}"`, `"Mover {dayName} a otro día"`, `"Eliminar {dayName}"`. Opción destructiva con `accessibilityHint="Acción destructiva, pide confirmación"`.
- Sheet y diálogos: `onRequestClose` cierra (ya lo hace `BottomSheetModal`/`ConfirmModal`); el foco debe volver al kebab al cerrar (comportamiento nativo al desmontar; no implementar `ref.focus()` manual salvo regresión detectada en `05-tests.md`).
- Contraste: label destructivo en `colors.error` sobre `colors.surface` (verificar ratio en dark mode en `05-tests.md`).

### 6. Limpieza normativa (el implementador debe borrar, no comentar)

- Borrar el bloque 731–758 (fila `Mover día`) y el `Modal` 997–1081 (reemplazado por el sheet del punto 3).
- Borrar estados que queden sin uso tras la migración (auditar `showMoveDay` → se conserva como `BottomSheetModal`; si algún estado del modal manual no se reutiliza, eliminarlo).
- **No** replicar el `Modal` + `Pressable` + dropdown absoluto de `groups/[groupId]/index.tsx` 402–435: ese patrón queda documentado como legado; la referencia válida es solo la lista de opciones, no la implementación.

## Tests

Ver `05-tests.md` (E2E del kebab + accesibilidad con screen-reader).

## Criterios de Aceptación

- [ ] Header de `[day].tsx`: pill `Agregar` + kebab ⋮ 44×44; fila suelta `Mover día` eliminada; sin `Modal` manual de mover (grep `showMoveDay` solo vive en un `BottomSheetModal`)
- [ ] Kebab abre sheet con las 3 opciones, iconos y visibilidad según tabla del punto 2; `Mover`/`Eliminar` deshabilitados u ocultos con día vacío
- [ ] Mover funciona contra el swap corregido: ambos ocupados → pantallas de ambos días muestran contenidos intercambiados; destino vacío → move; tras éxito navega al destino
- [ ] Eliminar pide `ConfirmModal` destructivo con conteo + nota de marcas; confirma → toast + sale a `/(app)/routine`; cancela → sin cambios
- [ ] Cada acción tiene `accessibilityRole` + `accessibilityLabel` con nombre del día; `hitSlop ≥ 8`; verificado con screen-reader en `05-tests.md`
- [ ] `routine/index.tsx` intacto (sin kebab); `tsc` + `eslint` en `apps/mobile` en verde
