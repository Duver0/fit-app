import { useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { EXERCISES_QUERY, CREATE_EXERCISE_MUTATION } from '../../../../src/lib/graphql'

const UNITS = ['KG', 'REPS', 'MIN', 'SEC', 'M'] as const
const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', MIN: 'min', SEC: 'seg', M: 'm' }

export default function GroupDashboardScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()

  // --- Query ---
  const { data, loading, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { groupId },
  })

  // --- Mutation ---
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: EXERCISES_QUERY, variables: { groupId } }],
  })

  // --- State ---
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState<string>('KG')

  const exercises: any[] = data?.exercises || []

  // --- Create exercise ---
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Ejercicios' }} />

      <FlatList
        data={exercises}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
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
            onPress={() => router.push(`/(app)/groups/${groupId}/exercises/${ex.id}`)}
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
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
              overflow: 'hidden',
            }}>
              {ex.imageUrl ? (
                <Image
                  source={{ uri: ex.imageUrl }}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: 22, color: colors.primary, fontWeight: '700' }}>
                  {ex.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            {/* Name + unit */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {UNIT_LABELS[ex.unit] || ex.unit}
              </Text>
            </View>

            {/* Arrow */}
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        )}
      />

      {/* Create exercise modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
