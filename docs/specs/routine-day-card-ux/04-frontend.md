# Mejora tarjeta rutina-día — 04-frontend

## Objetivo
Refactorizar la tarjeta de ejercicio en `apps/mobile/app/(app)/routine/[day].tsx` (`renderItem` líneas 624-758) para cumplir los 4 requerimientos sin agregar dependencias ni romper flujos existentes.

## Dependencias
- `01-database.md`, `02-api.md`, `03-backend.md` verificados (sin cambios). Esta spec es la única con código.

## Archivos afectados
| Archivo | Cambio |
|---|---|
| `apps/mobile/app/(app)/routine/[day].tsx` | **Único archivo con diff.** Quitar badge `#sortOrder` (747-756), reescribir `handleMoveUp/Down` (272-286) con update optimista + `Animated`, reescribir bloque unidad/marca (687-702) + `formatPerformance` (90-97), reescribir bloque acciones (704-744) y columna de flechas (647-684). Extraer `ExerciseDayCard` como componente local en el mismo archivo (no crear archivos nuevos en primera iteración). |
| `apps/mobile/babel.config.js` | **No tocar.** Se documenta que NO tiene `react-native-reanimated/plugin` → por eso la animación es con `Animated` nativo. |
| `apps/mobile/src/lib/graphql.ts` | **No tocar** (reuso de mutations existentes). |

## Layout objetivo de la tarjeta
```
┌─────────────────────────────────────────┐
│ Press banca              [▲]            │
│ Grupo: Pecho             [▼]            │
│                                         │
│ ┌─────────────┐                         │
│ │ Actualizar marca│  ← cuadrado grande      │
│ │  (48×48+)   │     bajo las flechas    │
│ └─────────────┘                         │
│                                         │
│ Marca actual: 10 × 60 kg   (una línea)  │
│                              [Quitar]   │ ← texto pequeño, zona inferior
└─────────────────────────────────────────┘
```
Reglas:
- Header: nombre (16/600) + grupo (12/secondary). Sin `#sortOrder`, sin numeración derivada del `index`.
- Columna derecha: flechas ▲/▼ + botón Editar debajo (ver Spec D). Nada más en esa columna.
- Cuerpo: **una sola línea** de marca (ver Spec C). Sin badge de unidad separado.
- Pie: acción `Quitar` de baja prominencia, alejada de `Editar` (ver Spec D).

---

## Spec A — Quitar numeración #0, #1, #2

**Actual:** líneas 747-756, `Text` absoluto (`top: 8, right: 74`) con `#{item.sortOrder}`. Ruido técnico, se solapa con flechas en pantallas chicas.

**Propuesta concreta:** eliminar el bloque completo:
```tsx
// ELIMINAR (líneas 747-756):
{/* Sort order indicator */}
<Text style={{ position: 'absolute', top: 8, right: 74, ... }}>
  #{item.sortOrder}
</Text>
```
No reemplazar por `index + 1`, ni por "Posición N", ni por prop `debug`. El orden queda implícito por la posición en la `FlatList`.

**Criterios de aceptación:**
- [ ] `rg "sortOrder" "apps/mobile/app/(app)/routine/[day].tsx"` no retorna ningún uso en JSX (solo puede quedar en lógica de reorder si hace falta)
- [ ] Sin texto `#` + número en ninguna tarjeta, con 1 o con 20 ejercicios
- [ ] Sin regresión de layout: el header no deja hueco ni overlap donde estaba el badge (verificar en iOS/Android, modo claro/oscuro)

---

## Spec B — Animación al mover arriba/abajo + update optimista

**Actual:** `handleMoveUp/Down` (272-286) construye `newOrder` y llama `reorderExercises` con `refetchQueries`. Sin `optimisticResponse`, sin `Animated`/`LayoutAnimation`. Flechas 32×32 (647-684) con `opacity` 0.3 en bordes. Percepción: tap → nada → salto brusco al volver el refetch.

**Restricción técnica (no negociable en esta spec):** solo `Animated` nativo (`react-native`). Reanimated 3.6 está instalado pero `babel.config.js` no tiene el plugin → worklets/layout-animations de Reanimated **no funcionarán** (o crashean en release). NO agregar el plugin aquí (requiere rebuild del dev-client y testing en EAS). Si a futuro se habilita, migrar a `LayoutAnimation` de Reanimated o `FlipInEasyX` en spec separada.

**Propuesta concreta (3 partes):**

### B1. Update optimista en caché Apollo (feedback < 200 ms)
```tsx
import { useRef } from 'react'
import { Animated, LayoutAnimation, UIManager, Platform } from 'react-native'
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const moveAnim = useRef(new Animated.Value(0)).current // o un Map por item; ver riesgos

const handleMove = (index: number, dir: -1 | 1) => {
  const next = index + dir
  if (next < 0 || next >= exercises.length || reordering) return
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

  const ids = exercises.map((e: any) => e.exercise.id)
  const newOrder = [...ids]
  ;[newOrder[index], newOrder[next]] = [newOrder[next], newOrder[index]]

  reorderExercises({
    variables: { dayOfWeek, exerciseIds: newOrder },
    optimisticResponse: undefined, // ver B1-b
    update: (cache) => {
      // Reordena lo leído de ROUTINE_DAY_QUERY para este dayOfWeek
      const existing: any = cache.readQuery({ query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } })
      if (!existing?.routineDay?.exercises) return
      const byId = new Map(existing.routineDay.exercises.map((e: any) => [e.exercise.id, e]))
      const reordered = newOrder.map((id: string, i: number) => ({ ...byId.get(id), sortOrder: i }))
      cache.writeQuery({ query: ROUTINE_DAY_QUERY, variables: { dayOfWeek }, data: {
        ...existing, routineDay: { ...existing.routineDay, exercises: reordered },
      }})
    },
    onError: (e) => showErrorToast(e.message), // + rollback automático vía caché al fallar el optimista
  })
}
// handleMoveUp = (i) => handleMove(i, -1); handleMoveDown = (i) => handleMove(i, +1)
```
- B1-b: si `reorderExercises` retorna `Boolean` (no lista), **no** usar `optimisticResponse` tipado de lista; usar solo `update` + `refetchQueries` como reconciliación (mantener `refetchQueries` existente). El `update` optimista se revierte solo ante error.
- Mantener `disabled={index === 0 || reordering}` y `disabled={index === len-1 || reordering}` para evitar doble-tap concurrente.

### B2. Animación con `Animated` nativo (sin Reanimated)
- Opción recomendada (mínima, robusta con `FlatList`): `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` justo antes del `reorderExercises` optimista. Anima inserción/reorden de filas sin refs por item.
- Opción alternativa si `LayoutAnimation` se ve brusco en Android: envolver cada tarjeta en `Animated.View` con `translateY` de ±8px + `opacity` 0.7→1 durante 180 ms al moverse el item afectado (usar `useRef<Map<string, Animated.Value>>`). No usar `Animated.loop`, no usar interpolaciones complejas.
- Prohibido: `setTimeout`-driven reorders, animar `sortOrder` como estado local separado de Apollo (doble fuente de verdad), o importar `react-native-reanimated`.

### B3. Flechas accesibles (parte de B, se detalla target en D)
- Subir target de 32×32 a **mínimo 44×44** con `hitSlop ≥ 12` (el visual puede seguir en 32, el táctil no). Mantener `chevron-up/down` 18-20px.
- `accessibilityLabel` con contexto: `Mover {nombre} arriba` / `Mover {nombre} abajo`, más `accessibilityState={{ disabled }}` y `accessibilityHint="Reordena este ejercicio en la rutina del día"`.

**Criterios de aceptación:**
- [ ] Tap en ▲/▼ reordena visualmente en < 200 ms sin esperar red (throttling de red simulado con delay 2 s sigue moviéndose al instante)
- [ ] Tras éxito, el orden persiste tras `pull-to-refresh` y re-entrar a la pantalla
- [ ] Ante error de red/mutación, el orden vuelve al anterior + toast de error (rollback)
- [ ] Sin "salto" ni parpadeo: una sola transición suave; no hay doble aplicación (optimista + refetch que re-desordena)
- [ ] Doble-tap rápido no corrompe el orden (segundo tap ignorado mientras `reordering`)
- [ ] Funciona en Android con `LayoutAnimation` habilitado experimentalmente y en iOS sin flags
- [ ] No se importa `react-native-reanimated` en este archivo

---

## Spec C — Formato de marca sin redundancia (una sola indicación)

**Actual:** badge `UNIT_LABELS[unit]` (689-698, ej. `"reps + peso"`) + texto `Marca: {formatPerformance(...)}` (699-701). Con `REPS_AND_WEIGHT`, `formatPerformance` (90-97) retorna `` `${reps} × ${weight} ${UNIT_LABELS[unit]}` `` → render final: `[reps + peso] Marca: 10 × 10 reps + peso`. La unidad aparece 2 veces; además `×` + sufijo técnico confunde (`10 × 10 reps + peso` no dice cuál es peso).

**Propuesta concreta — regla única:**
> La unidad se muestra **exactamente una vez**, dentro del valor de la marca. Se elimina el badge separado. El prefijo es siempre `Marca actual:` (o `Sin marca` si no hay performance).

Tabla de formato (reemplaza `formatPerformance` actual):
| `unit` | Sin marca | Con marca | Ejemplo render |
|---|---|---|---|
| `KG` | `Sin marca — toca Actualizar marca` | `{value} kg` | `Marca actual: 60 kg` |
| `REPS` | idem | `{value} reps` | `Marca actual: 12 reps` |
| `REPS_AND_WEIGHT` | idem | `{reps} reps × {weight} kg` | `Marca actual: 10 reps × 60 kg` |
| `MIN` | idem | `{value} min` | `Marca actual: 30 min` |
| `SEC` | idem | `{value} seg` | `Marca actual: 90 seg` |
| `M` | idem | `{value} m` | `Marca actual: 200 m` |

Código:
```tsx
const UNIT_SHORT: Record<string, string> = { KG: 'kg', REPS: 'reps', MIN: 'min', SEC: 'seg', M: 'm' }

function formatPerformance(perf: any, unit: string): string {
  if (!perf) return '—'
  if (unit === 'REPS_AND_WEIGHT' && perf.reps != null && perf.weight != null) {
    return `${perf.reps} reps × ${perf.weight} kg`
  }
  const label = UNIT_SHORT[unit] ?? unit
  const v = perf.value ?? perf.reps ?? perf.weight ?? '—'
  return `${v} ${label}`
}

// En la tarjeta (reemplaza bloque 687-702):
<View style={{ marginTop: 10 }}>
  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
    {item.myPerformance ? `Marca actual: ${formatPerformance(item.myPerformance, item.exercise.unit)}` : 'Sin marca'}
  </Text>
  {!item.myPerformance && (
    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
      Toca Actualizar marca para registrarla
    </Text>
  )}
</View>
```
- Eliminar `UNIT_LABELS` con valor `'reps + peso'` (o reutilizarlo solo en el modal de crear-ejercicio si hace falta, no en la tarjeta).
- Caso borde `REPS_AND_WEIGHT` con solo uno de `reps/weight`: caer al formato simple (`12 reps` o `60 kg`) en vez de `× undefined`.

**Criterios de aceptación:**
- [ ] Ninguna tarjeta muestra la unidad 2 veces (buscar `reps + peso` + `Marca` simultáneos = 0 ocurrencias)
- [ ] `REPS_AND_WEIGHT` se lee como `10 reps × 60 kg` (reps primero, peso con `kg`, sin `+ peso` técnico)
- [ ] Unidades simples (`KG`, `REPS`, `MIN`, `SEC`, `M`) con una sola palabra corta (`kg`, `reps`, `min`, `seg`, `m`)
- [ ] Sin marca → `Sin marca` + hint, nunca `Marca: —` ni `Marca: undefined`
- [ ] Tests de `formatPerformance` en `05-tests.md` pasan para las 6 unidades + casos `null`

---

## Spec D — Jerarquía Editar (primario) vs Quitar (destructivo) + accesibilidad

**Actual:** fila 704-744 con dos pills iguales (`paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20`): `Actualizar marca` (`primary+'20'`) y `Quitar` (`error+'20'`). Mismo peso visual, juntos → tap erróneo destructivo. Requerimiento: Editar bajo las flechas, cuadrado más grande; Quitar separado y menor.

**Propuesta concreta:**
```tsx
{/* Columna derecha: flechas + editar (reemplaza View 647-684 y bloque 704-744) */}
<View style={{ alignItems: 'center', gap: 8 }}>
  <View style={{ flexDirection: 'row', gap: 4 }}>
    <TouchableOpacity onPress={() => handleMoveUp(index)} disabled={index === 0 || reordering}
      accessibilityRole="button" accessibilityLabel={`Mover ${item.exercise.name} arriba`}
      accessibilityHint="Sube este ejercicio una posición en la rutina"
      accessibilityState={{ disabled: index === 0 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', opacity: index === 0 ? 0.3 : 1 }}>
      <Ionicons name="chevron-up" size={20} color={colors.text} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => handleMoveDown(index)} disabled={index === exercises.length - 1 || reordering}
      accessibilityRole="button" accessibilityLabel={`Mover ${item.exercise.name} abajo`}
      accessibilityHint="Baja este ejercicio una posición en la rutina"
      accessibilityState={{ disabled: index === exercises.length - 1 }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', opacity: index === exercises.length - 1 ? 0.3 : 1 }}>
      <Ionicons name="chevron-down" size={20} color={colors.text} />
    </TouchableOpacity>
  </View>

  {/* Editar: primario, cuadrado grande, bajo flechas */}
  <TouchableOpacity onPress={() => handleOpenEditMark(item)}
    accessibilityRole="button" accessibilityLabel={`Actualizar marca de ${item.exercise.name}`}
    accessibilityHint="Abre el editor de tu marca para este ejercicio"
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    style={{ width: 92, height: 48, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
    <Ionicons name="pencil-outline" size={18} color="#1A1A1A" />
    <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '700' }}>Editar</Text>
  </TouchableOpacity>
</View>

// ... en el pie de la tarjeta, lejos del primario:
<TouchableOpacity onPress={() => setShowRemoveConfirm(item.exercise.id)}
  accessibilityRole="button" accessibilityLabel={`Quitar ${item.exercise.name} de la rutina`}
  accessibilityHint="Pide confirmación antes de eliminar"
  style={{ alignSelf: 'flex-end', marginTop: 12, paddingHorizontal: 8, paddingVertical: 8 }}>
  <Text style={{ color: colors.error, fontSize: 13, fontWeight: '400' }}>Quitar</Text>
</TouchableOpacity>
```
Reglas:
- `Editar`: sólido `colors.primary` con texto `#1A1A1A` (contraste del botón `Agregar` existente, línea 559-571), 92×48, `borderRadius: 12` (cuadrado, no pill), label corto `Editar` (el contexto lo da el `accessibilityLabel` + cercanía a `Marca actual:`). Mantiene `handleOpenEditMark(item)` intacto.
- `Quitar`: variante `ghost/destructive` — solo texto `colors.error` 13/400, sin fondo, alineado `flex-end`, separado ≥ 12px de `Editar`. Mantiene `setShowRemoveConfirm(id)` + `ConfirmModal` existente (no eliminar confirmación).
- Foco/accesibilidad: orden de foco = ▲, ▼, Editar, Quitar. Contraste texto/fondo ≥ 4.5:1 en ambos temas (verificar `colors.primary` sobre `#1A1A1A` y `colors.error` sobre `colors.surface` en dark mode).
- `minHeight` de tarjeta puede crecer (~+16px) por el botón 48px — aceptado; no fijar altura rígida.

**Criterios de aceptación:**
- [ ] `Editar` es el único botón sólido de la tarjeta; `Quitar` no tiene fondo ni icono y está en el pie, separado
- [ ] Targets táctiles: flechas ≥ 44×44, Editar 92×48, Quitar ≥ 44×44 (vía `padding` + `hitSlop`)
- [ ] Labels de accesibilidad incluyen el nombre del ejercicio; `disabled` se expone en flechas de borde
- [ ] Quitar sigue pidiendo confirmación (`ConfirmModal`); cancelar no elimina
- [ ] Sin regresión en dark mode / texto grande (fontScale 1.3): no hay overlap flechas↔Editar↔nombre

---

## Riesgos y mitigaciones
| Riesgo | Impacto | Mitigación |
|---|---|---|
| `LayoutAnimation` en Android requiere flag experimental; en algunos Oppo/Xiaomi se ignora | Animación ausente solo en esos devices | Flag + fallback: sin animación pero con update optimista (sigue < 200 ms). No crashea. |
| `FlatList` + `LayoutAnimation` puede parpadear con `refetchQueries` inmediato | Doble render | `update` escribe el orden final idéntico al que devolverá el refetch; si parpadea, diferir refetch con `awaitRefetchQueries: false` + `fetchPolicy: 'cache-first'` en reconciliación. |
| `optimisticResponse` mal tipado si la mutation retorna `Boolean` | Error TS/runtime | Usar solo `update`+`cache.modify` en ese caso (ver B1-b). Verificar tipo en `graphql.ts` antes de codificar. |
| Botón `Editar` sólido `primary` con bajo contraste en dark mode | A11y | Reutilizar combinación probada del botón `Agregar` (`primary` + `#1A1A1A`). Test de contraste en ambos temas. |
| Extraer `ExerciseDayCard` rompe `index`/`exercises.length` del closure | Flechas deshabilitadas mal | Pasar `index`, `isFirst`, `isLast`, `reordering` como props explícitas; no cerrar sobre `exercises` mutado. |
| `formatPerformance` con `perf.value = 0` tratado como falsy | Marca `0 kg` mostrada como `Sin marca` | Usar `!= null` en vez de `||` / ternario truthy. Cubierto en `05-tests.md`. |

## No-hacer (fuera de alcance)
- Drag & drop con gestos, swipe-to-delete, o Reanimated worklets.
- Cambiar `ConfirmModal`, `showEditMark`, `UPSERT_PERFORMANCE_MUTATION`, o el modal `Agregar ejercicio`.
- Internacionalización, nuevos iconos, o rediseño del header de la pantalla.
