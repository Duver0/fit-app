# Routine Main View — Responsive Grid (2 Cols) & Accessibility

## Objetivo
Definir la grilla responsive de 2 columnas para 7 tarjetas simétricas, con accesibilidad completa (navegación teclado, screen readers, focus management, reduce motion).

## Dependencias
- `01-visual-design.md` (estilos tarjeta trabajo/descanso)
- `02-avatar-stack.md` (contenido tarjeta trabajo)
- `03-day-helpers.md` (nombres abreviados, `isRestDay`)

## Grilla: 2 Columnas, 7 Tarjetas

### Layout Base
```tsx
<View style={styles.grid}>
  {DAYS.map((day, index) => (
    <DayCard key={index} dayOfWeek={index} ... />
  ))}
</View>

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16, // RN 0.71+ gap support; fallback marginBottom en card
  },
  card: {
    width: '48%', // 2 cols con gap ~4%
    aspectRatio: 1, // cuadrada aprox; o height fijo si contenido variable
    minHeight: 120,
  },
});
```

### Responsive Breakpoints
| Ancho Pantalla | Columnas | Card Width | Justificación |
|----------------|----------|------------|---------------|
| `< 360px` (teléfonos pequeños) | 2 | `48%` | Mantenido, scroll horizontal NO (wrap) |
| `360-600px` | 2 | `48%` | Estándar móvil |
| `600-900px` (tablets portrait) | 2 | `48%` | Opcional: 3 cols si diseño lo permite |
| `> 900px` (tablets landscape/web) | 3-4 | `31%` / `23%` | Futuro: `flexBasis: '31%'` |

> **MVP**: Fijo 2 columnas (`width: '48%'`). Tablet/web fuera de alcance.

### Orden Visual Fijo
Siempre **Lunes → Domingo** (índice 0 → 6), independiente de día actual. El día de descanso (Domingo por defecto) queda en posición 6 (última card, fila 4, col 2).

### Empty State (Semana Vacía)
Si `routineDays.length === 0`: mostrar `EmptyState` centrado **en lugar de** la grilla (comportamiento actual mantenido).

## Accesibilidad

### Navegación Teclado / TV / Switch Control
- Cada `DayCard` = `Pressable` con `accessibilityRole="button"`
- `tabIndex` implícito por `Pressable` (React Native maneja)
- **Focus order**: Lunes → Martes → ... → Domingo (left→right, top→bottom)
- **Focus ring**: `borderWidth: 2, borderColor: colors.primary` (ver `01-visual-design.md`)

### Screen Readers (TalkBack / VoiceOver)
```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={buildAccessibilityLabel(dayOfWeek, exercises, isRestDay)}
  accessibilityHint={isRestDay ? 'Día de descanso' : 'Ver detalle del día'}
  accessibilityState={{ disabled: false }}
  onPress={() => router.push(`/(app)/routine/${dayOfWeek}`)}
>
```

#### `buildAccessibilityLabel`
```typescript
function buildAccessibilityLabel(
  dayOfWeek: DayOfWeek,
  exercises: Exercise[],
  isRest: boolean
): string {
  const dayName = DAY_NAMES_FULL[dayOfWeek];
  if (isRest) return `${dayName}, día de descanso`;
  if (exercises.length === 0) return `${dayName}, sin ejercicios`;
  return `${dayName}, ${exercises.length} ejercicio${exercises.length !== 1 ? 's' : ''}`;
}
```

### Reduce Motion
```typescript
const { reduceMotionEnabled } = useReducedMotion(); // expo-accessibility or custom hook

<Pressable
  activeOpacity={reduceMotionEnabled ? 1 : 0.85}
  // ...
/>
```

### Hit Area Mínimo (44x44)
- `DayCard` `minHeight: 120`, `width: '48%'` → **garantizado > 44x44**
- Si contenido muy corto: `paddingVertical: 16` asegura altura

### Color Contrast (WCAG AA)
| Elemento | Light | Dark | Ratio vs Fondo |
|----------|-------|------|----------------|
| Texto nombre día (`colors.text`) | #2D3436 | #E0E0E0 | > 7:1 ✓ |
| Texto secundario (`colors.textSecondary`) | #636E72 | #A0A0B0 | > 4.5:1 ✓ |
| AvatarStack count (`colors.text`) | #2D3436 | #E0E0E0 | > 7:1 ✓ |
| Rest day icon (`colors.primary * 0.4`) | #A8D5BA66 | #7BBF9A66 | Decorativo (no requiere) |
| Rest day border (`colors.primary * 0.3`) | #A8D5BA4D | #7BBF9A4D | Decorativo |

### Dynamic Type (Tamaño Fuente Sistema)
- Usar `fontSize` base + `PixelRatio.getFontScale()` si necesario
- `AvatarStack` size fijo (32px) — no escala (iconografía)
- Textos tarjeta: `fontSize: 16` base, escalable

## Focus Management (Navegación)
- Al volver de `routine/[day].tsx` → `routine/index.tsx`: focus vuelve a tarjeta origen
- Implementar con `useFocusEffect` + `ref` en cada `DayCard` (fase 2, opcional MVP)

## Tests de Accesibilidad
- [ ] `accessibilityLabel` correcto para work day con ejercicios
- [ ] `accessibilityLabel` correcto para work day sin ejercicios
- [ ] `accessibilityLabel` correcto para rest day
- [ ] Focus ring visible en navegación teclado (web/TV)
- [ ] `activeOpacity` respeta `reduceMotionEnabled`
- [ ] Contraste texto/fondo ≥ 4.5:1 en light y dark
- [ ] Hit area ≥ 44x44 en todas las tarjetas
- [ ] Orden focus: Lunes → Domingo secuencial

## Archivos Afectados
- `apps/mobile/app/(app)/routine/index.tsx` (grilla + integración)
- `apps/mobile/src/components/ui/AvatarStack.tsx` (a11y interno)
- `apps/mobile/src/lib/routine/dayHelpers.ts` (nombres a11y)