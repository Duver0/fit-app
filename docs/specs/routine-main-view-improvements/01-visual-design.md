# Routine Main View — Visual Design (Work vs Rest Cards)

## Objetivo
Definir la diferenciación visual entre tarjetas de día de **trabajo** (con ejercicios o vacíos) y tarjetas de **día de descanso**, sin usar texto explícito ("Descanso", "Trabajo"). Solo señales visuales: fondo, borde, icono, opacidad.

## Dependencias
- `02-avatar-stack.md` debe completarse antes (el stack vive dentro de la tarjeta)
- `03-day-helpers.md` provee `isRestDay(dayOfWeek)`

## Diseño Visual

### Tarjeta Día de Trabajo (Work Day)
| Propiedad | Valor Light | Valor Dark |
|-----------|-------------|------------|
| `backgroundColor` | `colors.surface` (#FFFFFF) | `colors.surface` (#16213E) |
| `borderColor` | `colors.border` (#E8E0D8) | `colors.border` (#2A2A3E) |
| `borderWidth` | 1 | 1 |
| `opacity` | 1.0 | 1.0 |
| Icono decorativo | Ninguno (o checkmark si tiene ejercicios) | Ninguno |
| AvatarStack | Visible (incluso si 0 ejercicios → estado vacío) | Visible |

### Tarjeta Día de Descanso (Rest Day)
| Propiedad | Valor Light | Valor Dark |
|-----------|-------------|------------|
| `backgroundColor` | `colors.background` (#FFF8F0) *o* `colors.surface` con overlay | `colors.background` (#1A1A2E) *o* `colors.surface` con overlay |
| `borderColor` | `colors.primary` con 30% opacity (#A8D5BA4D) | `colors.primary` con 30% opacity (#7BBF9A4D) |
| `borderWidth` | 1 | 1 |
| `opacity` | 0.6 | 0.6 |
| Icono decorativo | `Ionicons` `moon` / `bed` / `pause-circle` (24px, `colors.primary` 40%) | Mismo icono, `colors.primary` 40% |
| AvatarStack | **Oculto** (no aplica) | **Oculto** |

> **Nota**: El fondo del día de descanso usa `colors.background` (no `surface`) para crear contraste sutil. En light: crema cálido (#FFF8F0). En dark: azul muy oscuro (#1A1A2E). El borde primario translúcido refuerza "estado especial".

### Estados Comunes
| Estado | Work Day | Rest Day |
|--------|----------|----------|
| `activeOpacity` (press) | 0.85 | 0.7 (ya está en 0.6 base) |
| `disabled` (futuro) | `opacity: 0.5` | `opacity: 0.4` |
| `focus` (a11y) | `borderWidth: 2, borderColor: colors.primary` | Mismo |

### Theme Tokens Nuevos (si no existen)
Añadir a `apps/mobile/src/theme/colors.ts` si no están:
```typescript
// En light y dark:
restDayOverlay: 'rgba(0,0,0,0.04)', // light
restDayOverlay: 'rgba(255,255,255,0.04)', // dark
restBorder: 'primary + "4D"', // 30% opacity
restIconOpacity: 0.4,
```

### Layout Tarjeta (Estructura Común)
```
┌─────────────────────────────────┐
│  Nombre día (custom o default)  │  ← fontSize 16, semibold, colors.text
│  [Nombre real si custom]        │  ← caption, colors.textSecondary (solo si custom)
├─────────────────────────────────┤
│  [Work] AvatarStack + count     │  ← Ver 02-avatar-stack.md
│  [Rest] Icono decorativo centrado│  ← moon/bed, size 28, color primary*0.4
└─────────────────────────────────┘
  (NO badge numérico inferior)
```

### Accesibilidad Visual
- Contraste mínimo WCAG AA: texto sobre fondo ≥ 4.5:1
- Rest day opacity 0.6 **no** afecta texto (texto sigue 1.0)
- Focus visible: borde 2px `colors.primary` en ambas variantes
- Reduce motion: `activeOpacity` instantáneo (sin animación) si `prefersReducedMotion`

## Criterios de Aceptación
- [ ] Work day: fondo surface, borde border, opacity 1.0, AvatarStack visible
- [ ] Rest day: fondo background, borde primary 30%, opacity 0.6, icono centrado, SIN AvatarStack
- [ ] Transición dark/light: tokens resueltos vía `useTheme()`, sin hardcode
- [ ] Focus ring visible en navegación teclado/TV
- [ ] Sin texto "Descanso"/"Trabajo" en UI

## Implementación Sugerida
```typescript
// En routine/index.tsx o helper
const getCardStyle = (isRest: boolean, theme: ThemeColors) => ({
  backgroundColor: isRest ? theme.background : theme.surface,
  borderColor: isRest ? `${theme.primary}4D` : theme.border,
  opacity: isRest ? 0.6 : 1.0,
  borderWidth: 1,
  borderRadius: 16,
});
```