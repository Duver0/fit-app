# Routine Main View — Integration in routine/index.tsx

## Objetivo
Integrar todos los componentes y helpers en la pantalla principal de rutina (`apps/mobile/app/(app)/routine/index.tsx`), reemplazando la implementación actual.

## Dependencias
- `01-visual-design.md` (estilos tarjeta)
- `02-avatar-stack.md` (`AvatarStack` componente)
- `03-day-helpers.md` (`DAY_NAMES_SHORT`, `isRestDay`, `DayOfWeek`)
- `04-grid-responsive.md` (grilla, a11y)

## Cambios en routine/index.tsx

### Imports Nuevos
```typescript
// Helpers
import { DAY_NAMES_SHORT, isRestDay, type DayOfWeek } from '@/lib/routine/dayHelpers';
// UI
import { AvatarStack } from '@/components/ui/AvatarStack';
// Theme (ya existe)
import { useTheme } from '@/theme/ThemeProvider';
```

### Eliminar / Reemplazar
| Actual | Nuevo |
|--------|-------|
| `DAY_NAMES` array local | `DAY_NAMES_SHORT` + `DAY_NAMES_FULL` de helper |
| Badge circular número (líneas 145-161) | **Eliminar completamente** |
| Texto "N ejercicios" / "Sin ejercicios" (132-143) | `<AvatarStack exercises={...} />` |
| Estilos inline tarjeta | `getCardStyle(isRest, colors)` helper |
| `Ionicons` checkmark-circle | Gestionado por `AvatarStack` (vacío) o visual tarjeta |

### Estructura Nueva de Tarjeta
```tsx
const DayCard = ({ dayOfWeek, dayData, customName }: DayCardProps) => {
  const { colors } = useTheme();
  const exercises = dayData?.exercises || [];
  const hasExercises = exercises.length > 0;
  const rest = isRestDay(dayOfWeek);
  const dayLabel = DAY_NAMES_SHORT[dayOfWeek];
  const fullName = DAY_NAMES_FULL[dayOfWeek]; // para a11y

  const cardStyle = getCardStyle(rest, colors);

  return (
    <Pressable
      key={dayOfWeek}
      onPress={() => router.push(`/(app)/routine/${dayOfWeek}`)}
      accessibilityRole="button"
      accessibilityLabel={buildA11yLabel(fullName, exercises, rest)}
      accessibilityHint={rest ? 'Día de descanso' : 'Ver detalle del día'}
      style={({ pressed }) => [
        cardStyle,
        { opacity: pressed ? (rest ? 0.5 : 0.85) : 1 },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // 44x44 garantizado
    >
      {/* Nombre día (custom o default) */}
      <Text style={styles.dayName}>{customName || dayLabel}</Text>
      {customName && <Text style={styles.realName}>{dayLabel}</Text>}

      {/* Contenido: Work vs Rest */}
      {rest ? (
        // Día de descanso: icono centrado
        <View style={styles.restIconContainer}>
          <Ionicons name="moon" size={28} color={`${colors.primary}66`} />
        </View>
      ) : (
        // Día trabajo: AvatarStack
        <AvatarStack
          exercises={exercises.map(e => ({
            id: e.id,
            name: e.name,
            imageUrl: e.imageUrl,
          }))}
          size={32}
          maxVisible={4}
          overlap={-8}
          accessibilityLabel={`${fullName}, ${exercises.length} ejercicio${exercises.length !== 1 ? 's' : ''}`}
        />
      )}
    </Pressable>
  );
};
```

### Helper `getCardStyle`
```typescript
function getCardStyle(isRest: boolean, colors: ThemeColors): ViewStyle {
  return {
    backgroundColor: isRest ? colors.background : colors.surface,
    borderColor: isRest ? `${colors.primary}4D` : colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    opacity: isRest ? 0.6 : 1.0,
    minHeight: 120,
  };
}
```

### Estilos Comunes (StyleSheet)
```typescript
const styles = StyleSheet.create({
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436', // se sobrescribe con colors.text en runtime
    marginBottom: 2,
  },
  realName: {
    fontSize: 11,
    color: '#636E72', // colors.textSecondary
    marginBottom: 8,
  },
  restIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});
```
> **Nota**: Colores en StyleSheet son placeholders; valores reales vienen de `getCardStyle` + `colors` en inline style.

### Loading / Error / Empty States (Mantenidos)
- **Loading**: Skeletons 7 tarjetas (igual actual, pero `aspectRatio: 1`)
- **Error**: `ErrorState` con `onRetry`
- **Empty**: `EmptyState` "Rutina vacía" (cuando `routineDays.length === 0`)

### Query GraphQL (Sin Cambios)
```typescript
const { data, loading, error, refetch } = useQuery(MY_ROUTINE_DAYS_QUERY);
// MY_ROUTINE_DAYS_QUERY ya retorna: dayOfWeek, id, name, exercises[{id,name,imageUrl,...}]
```

## Archivo Completo Resultante (Esquema)
```typescript
// apps/mobile/app/(app)/routine/index.tsx
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { MY_ROUTINE_DAYS_QUERY } from '@/lib/graphql';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { DAY_NAMES_FULL, DAY_NAMES_SHORT, isRestDay, type DayOfWeek } from '@/lib/routine/dayHelpers';
import { AvatarStack } from '@/components/ui/AvatarStack';

export default function RoutineIndexScreen() {
  const { colors } = useTheme();
  const { data, loading, error, refetch } = useQuery(MY_ROUTINE_DAYS_QUERY);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  if (loading && !data) return <LoadingSkeletons colors={colors} />;
  if (error) return <ErrorScreen error={error} onRetry={refetch} colors={colors} />;

  const routineDays = data?.myRoutineDays || [];
  const dayMap = buildDayMap(routineDays);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Mi Rutina" showBack={false} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {routineDays.length === 0 ? (
          <EmptyState title="Rutina vacía" subtitle="Agrega ejercicios a tu rutina desde un día específico" />
        ) : (
          <View style={styles.grid}>
            {Array.from({ length: 7 }).map((_, index) => (
              <DayCard
                key={index}
                dayOfWeek={index as DayOfWeek}
                dayData={dayMap[index]}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ... helpers: buildDayMap, getCardStyle, buildA11yLabel, DayCard component, styles
```

## Criterios de Aceptación Integración
- [ ] 7 tarjetas renderizadas siempre (Lun-Dom)
- [ ] Domingo (idx 6) = rest day visual (fondo background, borde primary 30%, opacity 0.6, icono moon)
- [ ] Lunes-Sábado = work day visual (fondo surface, borde border, opacity 1.0, AvatarStack)
- [ ] AvatarStack muestra hasta 4 avatares + overflow +N, count total a la derecha
- [ ] Sin badge numérico 1-7 en ninguna tarjeta
- [ ] Nombres abreviados "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom" visibles
- [ ] Nombre custom editable se muestra arriba, nombre real abajo (comportamiento actual mantenido)
- [ ] Navegación a `/(app)/routine/${dayOfWeek}` funciona
- [ ] Dark/light theme: colores resueltos vía `useTheme()`, sin hardcode
- [ ] Accesibilidad: labels, hints, focus ring, hit area ≥44x44
- [ ] Pull-to-refresh funciona
- [ ] Loading/Error/Empty states preservados

## Archivos Modificados
- `apps/mobile/app/(app)/routine/index.tsx` (reescrito)
- `apps/mobile/src/components/ui/AvatarStack.tsx` (nuevo, ver 02-avatar-stack.md)
- `apps/mobile/src/lib/routine/dayHelpers.ts` (nuevo, ver 03-day-helpers.md)