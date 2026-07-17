# Exercise Refactor — Frontend (React Native / Expo Router)

> **Estado: ✅ COMPLETADO**

## Objetivo
Simplificar el Group Dashboard eliminando el registro inline de marcas y el top 3 inline, mostrando cada ejercicio como una tarjeta con imagen (thumbnail o placeholder) que navega al detalle individual. Enriquecer la pantalla de detalle del ejercicio para mostrar TODAS las marcas de todos los miembros del grupo con ranking ordenado, destacando el top 3 visualmente y manteniendo el sistema de disputas existente.

## Dependencias
- `02-api.md` y `03-backend.md` deben completarse primero (los cambios en GraphQL types deben estar deployados).

## Frontend

### Archivos a modificar

#### 1. `apps/mobile/src/lib/graphql.ts`

**EXERCISES_QUERY**: Agregar `imageUrl` y `avatarUrl` del creator.

```graphql
# Antes
export const EXERCISES_QUERY = gql`
  query Exercises($groupId: String!) {
    exercises(groupId: $groupId) {
      id
      name
      unit
      createdBy {
        id
        name
      }
    }
  }
`

# Después
export const EXERCISES_QUERY = gql`
  query Exercises($groupId: String!) {
    exercises(groupId: $groupId) {
      id
      name
      unit
      imageUrl
      createdBy {
        id
        name
        avatarUrl
      }
    }
  }
`
```

**CREATE_EXERCISE_MUTATION**: Agregar `imageUrl` en input y respuesta.

```graphql
# Antes
export const CREATE_EXERCISE_MUTATION = gql`
  mutation CreateExercise($input: CreateExerciseInput!) {
    createExercise(input: $input) {
      id
      name
      unit
    }
  }
`

# Después
export const CREATE_EXERCISE_MUTATION = gql`
  mutation CreateExercise($input: CreateExerciseInput!) {
    createExercise(input: $input) {
      id
      name
      unit
      imageUrl
      createdBy {
        id
        name
      }
    }
  }
`
```

**GROUP_QUERY**: Agregar `imageUrl` en ejercicios.

```graphql
# Antes dentro de GROUP_QUERY
exercises {
  id
  name
  unit
}

# Después
exercises {
  id
  name
  unit
  imageUrl
}
```

**(Opcional) UPDATE_EXERCISE_IMAGE_MUTATION**: Nueva mutation.

```graphql
export const UPDATE_EXERCISE_IMAGE_MUTATION = gql`
  mutation UpdateExerciseImage($id: String!, $imageUrl: String!) {
    updateExerciseImage(id: $id, imageUrl: $imageUrl) {
      id
      name
      unit
      imageUrl
    }
  }
`
```

#### 2. `apps/mobile/src/hooks/useExercises.ts`

**Cambio**: Actualizar tipado para incluir `imageUrl` y pasar el parámetro al crear.

```typescript
import { useQuery, useMutation } from '@apollo/client'
import { EXERCISES_QUERY, CREATE_EXERCISE_MUTATION } from '../lib/graphql'

export function useExercises(groupId: string) {
  const { data, loading, error, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { groupId },
    skip: !groupId,
  })

  const [createExerciseMutation, { loading: isCreating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: EXERCISES_QUERY, variables: { groupId } }],
  })

  // Actualizado: acepta imageUrl opcional
  const createExercise = async (name: string, unit: string = 'KG', imageUrl?: string) => {
    return createExerciseMutation({
      variables: { input: { groupId, name, unit, imageUrl } },
    })
  }

  return {
    exercises: data?.exercises || [],
    isLoading: loading,
    isCreating,
    error,
    refetch,
    createExercise,
  }
}
```

#### 3. `apps/mobile/app/(app)/groups/[groupId]/index.tsx` — REFACTOR COMPLETO

**Cambios principales**:
1. Eliminar `TOP3_RANKING_QUERY` y su data/refetch
2. Eliminar `UPSERT_PERFORMANCE_MUTATION` y su lógica
3. Eliminar el estado `markingExerciseId`, `markValue`, `myMarks`
4. Eliminar `getUserMark()` helper
5. Simplificar cada tarjeta de ejercicio: imagen (thumbnail o placeholder circular), nombre, unidad, al tocar navega al detalle
6. Mantener el modal de crear ejercicio (agregar campo de imageUrl opcional en futura iteración)

**Nueva estructura del screen**:

```typescript
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert, Image } from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../../src/stores/authStore'
import { EXERCISES_QUERY, CREATE_EXERCISE_MUTATION } from '../../../../src/lib/graphql'

const UNITS = ['KG', 'REPS', 'MIN', 'SEC', 'M'] as const
const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', MIN: 'min', SEC: 'seg', M: 'm' }

export default function GroupDashboardScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const currentUserId = useAuthStore(state => state.user?.id)

  // --- Queries ---
  const { data: exercisesData, loading: exercisesLoading, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { groupId },
  })

  // --- Mutations ---
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: EXERCISES_QUERY, variables: { groupId } }],
  })

  // --- State ---
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState<string>('KG')

  const exercises: any[] = exercisesData?.exercises || []

  const handleCreateExercise = async () => {
    if (!exerciseName.trim()) return
    try {
      const result = await createExercise({
        variables: { input: { groupId, name: exerciseName.trim(), unit: exerciseUnit } },
      })
      if (result.errors?.[0]) {
        Alert.alert('Error', result.errors[0].message)
        return
      }
      setShowCreateModal(false)
      setExerciseName('')
      setExerciseUnit('KG')
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error de red'
      Alert.alert('Error', msg)
    }
  }

  const handleNavigateToExercise = (exerciseId: string) => {
    router.push(`/(app)/groups/${groupId}/exercises/${exerciseId}`)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Grupo' }} />

      <FlatList
        data={exercises}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={exercisesLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>
                + Crear ejercicio
              </Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>
                No hay ejercicios en este grupo aún
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                Creá el primer ejercicio para empezar a competir
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: ex }: any) => (
          <TouchableOpacity
            onPress={() => handleNavigateToExercise(ex.id)}
            activeOpacity={0.7}
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Exercise image */}
            {ex.imageUrl ? (
              <Image
                source={{ uri: ex.imageUrl }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  marginRight: 14,
                  backgroundColor: colors.background,
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: colors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 14,
              }}>
                <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '700' }}>
                  {ex.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Exercise info */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                Unidad: {UNIT_LABELS[ex.unit] || ex.unit}
              </Text>
            </View>

            {/* Chevron */}
            <Text style={{ color: colors.textSecondary, fontSize: 18, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>
        )}
      />

      {/* Create exercise modal (sin cambios funcionales) */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
              Crear ejercicio
            </Text>

            <TextInput
              value={exerciseName}
              onChangeText={setExerciseName}
              placeholder="Nombre del ejercicio (ej: Press banca)"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16,
                borderWidth: 1, borderColor: colors.border, fontSize: 16,
              }}
            />

            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Unidad de medida</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  onPress={() => setExerciseUnit(unit)}
                  style={{
                    backgroundColor: exerciseUnit === unit ? colors.primary : colors.background,
                    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
                    borderWidth: 1, borderColor: exerciseUnit === unit ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{
                    color: exerciseUnit === unit ? colors.text : colors.textSecondary,
                    fontWeight: exerciseUnit === unit ? '600' : '400',
                  }}>
                    {UNIT_LABELS[unit]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TODO: Agregar campo imageUrl en futura iteración con ImagePicker */}

            <TouchableOpacity
              onPress={handleCreateExercise}
              disabled={!exerciseName.trim() || creating}
              style={{
                backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
                opacity: (!exerciseName.trim() || creating) ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {creating ? 'Creando…' : 'Crear ejercicio'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setShowCreateModal(false); setExerciseName(''); setExerciseUnit('KG') }} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
```

#### 4. `apps/mobile/app/(app)/groups/[groupId]/exercises/[exerciseId].tsx` — ENRIQUECER

**Cambios**:
1. Mostrar la imagen del ejercicio (si tiene) en el header
2. Mantener el ranking completo con avatar + nombre + valor + posición
3. Top 3 destacado visualmente (medallas/dorado/plata/bronce)
4. Mantener sistema de disputas intacto
5. Agregar el unit label más descriptivo (ej: "kg", "reps")

**Nuevo header con imagen**:

```typescript
// Dentro del return, después de Stack.Screen, reemplazar el header actual:
<View style={{ padding: 24, paddingTop: 60 }}>
  {exercise?.imageUrl && (
    <Image
      source={{ uri: exercise.imageUrl }}
      style={{
        width: '100%',
        height: 180,
        borderRadius: 16,
        marginBottom: 16,
        backgroundColor: colors.background,
      }}
      resizeMode="cover"
    />
  )}
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
        {exercise?.name}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
        Unidad: {exercise?.unit || 'kg'}
      </Text>
    </View>
  </View>
</View>
```

**Mejorar el ranking para destacar top 3**:

```typescript
// En renderItem del ranking, mejorar visual:
renderItem={({ item, index }: any) => {
  const isTop3 = item.rank <= 3
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']
  const medalEmojis = ['🥇', '🥈', '🥉']
  
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: isTop3 ? 2 : 1,
      borderColor: isTop3 ? medalColors[index] : colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {/* Rank badge */}
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isTop3 ? medalColors[index] + '30' : colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
      }}>
        <Text style={{
          fontWeight: 'bold',
          fontSize: isTop3 ? 18 : 14,
          color: isTop3 ? medalColors[index] : colors.textSecondary,
        }}>
          {isTop3 ? medalEmojis[index] : `#${item.rank}`}
        </Text>
      </View>

      {/* Avatar */}
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.accent,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 10,
      }}>
        {item.user.avatarUrl ? (
          <Image source={{ uri: item.user.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            {item.user.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      {/* Name + value */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
          {item.user.name}
        </Text>
      </View>

      {/* Value */}
      <Text style={{
        color: isTop3 ? medalColors[index] : colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: 8,
      }}>
        {item.value}
      </Text>

      {/* Dispute buttons (mantener igual) */}
      <TouchableOpacity
        onPress={() => setDisputeVotingPerformanceId(item.id)}
        style={{ backgroundColor: colors.primary + '20', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4 }}
      >
        <Text style={{ color: colors.primary, fontSize: 12 }}>Disputas</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setShowDispute(item.id)}
        style={{ backgroundColor: colors.error + '20', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}
      >
        <Text style={{ color: colors.error, fontSize: 12 }}>Disputar</Text>
      </TouchableOpacity>
    </View>
  )
}}
```

**Agregar import de Image**:

```typescript
// Al inicio del archivo, agregar Image a los imports de react-native
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Image } from 'react-native'
```

### Checklist de implementación

| Item | Estado |
|------|--------|
| `graphql.ts`: `EXERCISES_QUERY` con `imageUrl` + `avatarUrl` | ✅ Completo |
| `graphql.ts`: `GROUP_QUERY` con `imageUrl` en exercises | ✅ Completo |
| `graphql.ts`: `CREATE_EXERCISE_MUTATION` con `imageUrl` en respuesta | ✅ Completo |
| `graphql.ts`: `UPDATE_EXERCISE_IMAGE_MUTATION` agregada | ✅ Completo |
| `graphql.ts`: `TOP3_RANKING_QUERY` con `imageUrl` en exercise | ✅ Completo |
| `useExercises.ts`: `createExercise()` acepta `imageUrl` opcional | ✅ Completo |
| `index.tsx`: eliminar `TOP3_RANKING_QUERY` y `UPSERT_PERFORMANCE_MUTATION` | ✅ Completo |
| `index.tsx`: eliminar estado `markingExerciseId`, `markValue`, `myMarks` | ✅ Completo |
| `index.tsx`: eliminar helper `getUserMark()` | ✅ Completo |
| `index.tsx`: tarjetas con imagen/placeholder + nombre + unidad | ✅ Completo |
| `index.tsx`: navegación al detalle al tocar tarjeta | ✅ Completo |
| `index.tsx`: mantener modal de crear ejercicio | ✅ Completo |
| `[exerciseId].tsx`: header con imagen del ejercicio (120×120) | ✅ Completo |
| `[exerciseId].tsx`: top 3 destacado con medallas 🥇🥈🥉 | ✅ Completo |
| `[exerciseId].tsx`: ranking completo con todos los miembros | ✅ Completo |
| `[exerciseId].tsx`: avatar de usuario en cada fila del ranking | ✅ Completo |
| `[exerciseId].tsx`: sistema de disputas intacto | ✅ Completo |
| `[exerciseId].tsx`: labels de unidad más descriptivos | ✅ Completo |

### Resumen de cambios por archivo

| Archivo | Cambio |
|---------|--------|
| `apps/mobile/src/lib/graphql.ts` | Agregar `imageUrl` en `EXERCISES_QUERY`, `CREATE_EXERCISE_MUTATION`, `GROUP_QUERY`, `TOP3_RANKING_QUERY`. Agregar `UPDATE_EXERCISE_IMAGE_MUTATION`. |
| `apps/mobile/src/hooks/useExercises.ts` | Actualizar `createExercise()` para aceptar `imageUrl` opcional. |
| `apps/mobile/app/(app)/groups/[groupId]/index.tsx` | **Refactor completo**: eliminar ranking inline, eliminar registro inline de marcas, simplificar a lista de ejercicios con imagen/nombre/unidad + navegación al detalle. |
| `apps/mobile/app/(app)/groups/[groupId]/exercises/[exerciseId].tsx` | Agregar imagen del ejercicio en header, mejorar visual del ranking con medallas para top 3, mostrar avatar de usuarios. |
