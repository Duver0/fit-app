# Routine Main View — Tests

## Objetivo
Definir escenarios de prueba por capa para validar la implementación completa.

## Dependencias
- Todas las specs previas (01-05)

## Estrategia de Testing

### 1. Unit Tests — Helpers (`dayHelpers.test.ts`)
**Archivo**: `apps/mobile/__tests__/lib/routine/dayHelpers.test.ts`

| Test Case | Descripción |
|-----------|-------------|
| `DAY_NAMES_FULL` length 7 | Array completo 7 elementos |
| `DAY_NAMES_SHORT` length 7 | Abreviaciones 7 elementos |
| `isRestDay(6)` → true | Domingo por defecto es descanso |
| `isRestDay(0)` → false | Lunes no es descanso |
| `isRestDay(3, 3)` → true | Override configurable funciona |
| `sortDaysByWeek` orden 0→6 | Orden natural mantenido |
| `getTodayDayOfWeek` 0-6 | Retorna DayOfWeek válido |
| `hasCompleteWeek` true/false | Detecta semana completa |

### 2. Unit Tests — AvatarStack (`AvatarStack.test.tsx`)
**Archivo**: `apps/mobile/__tests__/components/ui/AvatarStack.test.tsx`

| Test Case | Descripción |
|-----------|-------------|
| Render 0 ejercicios | Ghost avatar + count "0" |
| Render 1 ejercicio | 1 avatar + count "1" |
| Render 3 ejercicios | 3 avatares stack + count "3" |
| Render 6 ejercicios (maxVisible=4) | 3 avatares + badge "+3" + count "6" |
| `imageUrl` presente | Avatar muestra Image (mock) |
| `imageUrl` null | Avatar muestra iniciales (2 letras) |
| `onPress` callback | Dispara función al presionar contenedor |
| `accessibilityLabel` contenedor | Label correcto según ejercicios |
| Dark mode colors | Usa `useTheme()` colores |
| Reduce motion | `activeOpacity` = 1 si enabled |

**Mocks necesarios**:
- `useTheme` → retorna `colors.light` / `colors.dark`
- `Avatar` → mock component que verifica props
- `expo-image` → mock para evitar carga real

### 3. Unit Tests — DayCard / RoutineIndex (`routine-index.test.tsx`)
**Archivo**: `apps/mobile/__tests__/app/(app)/routine/index.test.tsx`

| Test Case | Descripción |
|-----------|-------------|
| Render 7 tarjetas | Grid siempre 7 cards (Lun-Dom) |
| Rest day (idx 6) visual | Fondo background, borde primary 30%, opacity 0.6, icono moon |
| Work day (idx 0-5) visual | Fondo surface, borde border, opacity 1.0, AvatarStack |
| Sin badge numérico | No existe elemento con texto "1".."7" en badge circular |
| Nombres abreviados | "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom" presentes |
| Nombre custom + real | Si `dayData.name` existe: custom arriba, real abajo |
| Navegación día | `router.push` llamado con `/(app)/routine/${dayOfWeek}` |
| AvatarStack exercises | Props ejercicios mapeados correctamente (id, name, imageUrl) |
| Dark mode | Colores resueltos vía `useTheme()` |
| Loading state | 7 Skeletons renderizados |
| Error state | ErrorState con mensaje y onRetry |
| Empty state | EmptyState si `routineDays.length === 0` |
| Pull-to-refresh | `refetch` llamado al refrescar |

### 4. Integration Tests — Flujo Completo
**Archivo**: `apps/mobile/__tests__/integration/routine-flow.test.tsx`

| Test Case | Descripción |
|-----------|-------------|
| Cargar rutina → ver 7 días → tap día → navega a detalle | Flujo happy path |
| Día con 5 ejercicios → AvatarStack muestra +1 | Overflow badge correcto |
| Día descanso → tap → navega a detalle (aunque vacío) | Navegación funciona en rest day |
| Cambio tema (light→dark) → colores actualizan | Reactividad theme |

### 5. E2E Tests (Detox / Maestro)
**Archivo**: `apps/mobile/e2e/routine-main-view.e2e.ts`

| Test Case | Descripción |
|-----------|-------------|
| App abre → pestaña Rutina → ve 7 cards | Smoke test |
| Card "Dom" tiene estilo descanso (visual regression) | Snapshot visual |
| Card "Lun" con ejercicios → AvatarStack visible | Visual regression |
| Tap "Mar" → navega a día individual | Navegación |
| Rotación / resize → grid 2 cols mantenido | Responsive |

## Accesibilidad Tests (axe / react-native-testing-library)
- [ ] `accessibilityRole="button"` en cada tarjeta
- [ ] `accessibilityLabel` descriptivo (día + estado + count)
- [ ] `accessibilityHint` en rest day vs work day
- [ ] Focus order: Lunes → Domingo secuencial
- [ ] Contraste ≥ 4.5:1 (verificar con `jest-axe` o manual)
- [ ] Hit area ≥ 44x44 (medir `layout` en test)

## Visual Regression (Chromatic / Storybook)
Crear stories para:
- `DayCard` work day (0, 1, 3, 6 ejercicios)
- `DayCard` rest day
- `AvatarStack` (0, 1, 4, 7 ejercicios)
- Grid completa 7 días (light + dark)

## Cobertura Mínima Objetivo
| Capa | Cobertura |
|------|-----------|
| Helpers (`dayHelpers`) | 100% |
| `AvatarStack` component | 90%+ |
| `routine/index.tsx` screen | 80%+ (excluyendo loading/error/empty boilerplate) |

## Comandos de Ejecución
```bash
# Unit tests
npm test -- --testPathPattern="dayHelpers|AvatarStack|routine/index"

# Integration
npm test -- --testPathPattern="integration/routine-flow"

# E2E (requiere device/emulator)
npm run e2e:routine

# Visual regression (Storybook)
npm run storybook:build
npx chromatic --project-token=<token>
```

## Criterios de Aceptación Testing
- [ ] Todos los unit tests pasan
- [ ] Integration tests pasan
- [ ] E2E smoke test pasa
- [ ] Visual regression: sin diffs inesperados (light/dark)
- [ ] Accesibilidad: 0 violaciones axe en componentes nuevos
- [ ] Cobertura helpers 100%, AvatarStack 90%, screen 80%