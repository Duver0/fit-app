# Routine Main View — Day Helpers (dayOfWeek, Abbreviations, Rest Day Logic)

## Objetivo
Centralizar lógica de días de la semana: nombres completos, abreviaciones, detección de día de descanso (fijo o configurable futuro), y utilidades de ordenamiento.

## Dependencias
- Ninguna (utilidades puras TypeScript)
- Consumido por: `01-visual-design.md`, `04-grid-responsive.md`, `05-main-screen.md`

## Constantes

### Nombres Completos (ES)
```typescript
export const DAY_NAMES_FULL: readonly string[] = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
] as const;
```

### Abreviaciones (3 letras, ES)
```typescript
export const DAY_NAMES_SHORT: readonly string[] = [
  'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom',
] as const;
```

> **Uso**: Tarjeta muestra `DAY_NAMES_SHORT[dayOfWeek]` como identificador principal. Nombre completo solo en detalle día (`[day].tsx`).

## Tipo Día
```typescript
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Lunes ... 6=Domingo
```

## Lógica Día de Descanso

### MVP: Fijo (Domingo = index 6)
```typescript
export const DEFAULT_REST_DAY: DayOfWeek = 6; // Domingo

export function isRestDay(dayOfWeek: DayOfWeek, restDay?: DayOfWeek): boolean {
  return dayOfWeek === (restDay ?? DEFAULT_REST_DAY);
}
```

### Futuro: Configurable (User Preference)
```typescript
// Interface para store/AsyncStorage
export interface RoutinePreferences {
  restDay: DayOfWeek; // 0-6
  // ... otras prefs futuras
}

// Hook sugerido (fase 2)
export function useRestDay(): DayOfWeek {
  const { restDay } = useRoutinePreferences(); // implementar store
  return restDay ?? DEFAULT_REST_DAY;
}
```

> **Nota**: Para este spec, `isRestDay(dayOfWeek)` usa `DEFAULT_REST_DAY = 6`. La preferencia configurable es **fuera de alcance** (fase 2).

## Utilidades Adicionales

### Orden Natural (Lunes → Domingo)
```typescript
export function sortDaysByWeek<T extends { dayOfWeek: DayOfWeek }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}
```

### Día Actual (Timezone Usuario)
```typescript
export function getTodayDayOfWeek(): DayOfWeek {
  const day = new Date().getDay(); // 0=Dom ... 6=Sáb
  return ((day + 6) % 7) as DayOfWeek; // 0=Lun ... 6=Dom
}
```

### Verificar Semana Completa (7 días)
```typescript
export function hasCompleteWeek(days: Array<{ dayOfWeek: DayOfWeek }>): boolean {
  const present = new Set(days.map(d => d.dayOfWeek));
  return DAY_NAMES_FULL.every((_, i) => present.has(i as DayOfWeek));
}
```

## Archivo Destino
`apps/mobile/src/lib/routine/dayHelpers.ts`

## Exportaciones
```typescript
export {
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  type DayOfWeek,
  DEFAULT_REST_DAY,
  isRestDay,
  sortDaysByWeek,
  getTodayDayOfWeek,
  hasCompleteWeek,
};
```

## Tests Requeridos
- [ ] `DAY_NAMES_FULL.length === 7`, `DAY_NAMES_SHORT.length === 7`
- [ ] `isRestDay(6) === true`, `isRestDay(0) === false`
- [ ] `isRestDay(3, 3) === true` (override configurable)
- [ ] `sortDaysByWeek` ordena 0→6
- [ ] `getTodayDayOfWeek` retorna 0-6 correcto
- [ ] `hasCompleteWeek` true solo si 7 días únicos 0-6

## Integración en routine/index.tsx
```typescript
import { DAY_NAMES_SHORT, isRestDay, type DayOfWeek } from '@/lib/routine/dayHelpers';

// En render:
const dayOfWeek = index as DayOfWeek;
const rest = isRestDay(dayOfWeek);
const label = DAY_NAMES_SHORT[dayOfWeek]; // "Lun", "Mar", ...
```