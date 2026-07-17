import { useState, useMemo } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../../src/stores/authStore'
import { EXERCISES_QUERY, TOP3_RANKING_QUERY, CREATE_EXERCISE_MUTATION, UPSERT_PERFORMANCE_MUTATION } from '../../../../src/lib/graphql'

const UNITS = ['KG', 'REPS', 'MIN', 'SEC', 'M'] as const
const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', MIN: 'min', SEC: 'seg', M: 'm' }

export default function GroupDashboardScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const currentUserId = useAuthStore(state => state.user?.id)

  // --- Queries ---
  const { data: exercisesData, loading: exercisesLoading, refetch: refetchExercises } = useQuery(EXERCISES_QUERY, {
    variables: { groupId },
  })
  const { data: rankingData, loading: rankingLoading, refetch: refetchRanking } = useQuery(TOP3_RANKING_QUERY, {
    variables: { groupId },
  })

  // --- Mutations ---
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: EXERCISES_QUERY, variables: { groupId } },
      { query: TOP3_RANKING_QUERY, variables: { groupId } },
    ],
  })
  const [upsertPerformance, { loading: savingMark }] = useMutation(UPSERT_PERFORMANCE_MUTATION, {
    refetchQueries: [{ query: TOP3_RANKING_QUERY, variables: { groupId } }],
  })

  // --- State ---
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState<string>('KG')

  // Which exercise is currently registering a mark, and its value
  const [markingExerciseId, setMarkingExerciseId] = useState<string | null>(null)
  const [markValue, setMarkValue] = useState('')
  // Local cache of my marks per exercise (so we always see them even if not top 3)
  const [myMarks, setMyMarks] = useState<Record<string, number>>({})

  const exercises: any[] = exercisesData?.exercises || []
  const top3Data: any[] = rankingData?.top3Ranking || []

  // Build a map from exercise id to ranking data (with top 3)
  const rankingByExerciseId = useMemo(() => {
    const map: Record<string, any> = {}
    for (const item of top3Data) {
      map[item.exercise.id] = item
    }
    return map
  }, [top3Data])

  // Merge exercises with ranking data
  const mergedList = useMemo(() => {
    return exercises.map((ex: any) => {
      const rankInfo = rankingByExerciseId[ex.id]
      return {
        exercise: ex,
        top: rankInfo?.top || [],
      }
    })
  }, [exercises, rankingByExerciseId])

  const isLoading = exercisesLoading || rankingLoading

  const handleRefetch = () => {
    refetchExercises()
    refetchRanking()
  }

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

  // --- Register mark ---
  const handleSaveMark = async () => {
    if (!markingExerciseId || !markValue.trim()) return
    const value = parseFloat(markValue.trim())
    if (isNaN(value) || value < 0) {
      Alert.alert('Error', 'Ingresá un valor numérico válido')
      return
    }
    try {
      const result = await upsertPerformance({
        variables: { input: { exerciseId: markingExerciseId, value } },
      })
      if (result.errors?.[0]) {
        Alert.alert('Error', result.errors[0].message)
        return
      }
      // Save locally so it always shows even if not in top 3
      setMyMarks(prev => ({ ...prev, [markingExerciseId]: value }))
      setMarkingExerciseId(null)
      setMarkValue('')
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error de red'
      Alert.alert('Error', msg)
    }
  }

  // Helper: find current user's mark from ranking top records or local cache
  const getUserMark = (top: any[], exerciseId: string) => {
    if (!currentUserId) return null
    // First check ranking (top 3)
    const fromRanking = top.find((r: any) => r.user?.id === currentUserId)
    if (fromRanking) return fromRanking
    // Then check local cache
    if (myMarks[exerciseId] !== undefined) {
      return { value: myMarks[exerciseId], user: { id: currentUserId } }
    }
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Grupo' }} />

      <FlatList
        data={mergedList}
        keyExtractor={(item: any) => item.exercise.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* Create exercise button at top */}
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

            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                Ejercicios
              </Text>
            </View>
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
        renderItem={({ item }: any) => {
          const ex = item.exercise
          const top = item.top
          const myMark = getUserMark(top, ex.id)
          const isMarking = markingExerciseId === ex.id

          return (
            <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              {/* Exercise header + unit */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '20',
                    justifyContent: 'center', alignItems: 'center', marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '700' }}>
                      {ex.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Unidad: {UNIT_LABELS[ex.unit] || ex.unit}
                    </Text>
                  </View>
                </View>
              </View>

              {/* My current mark */}
              {myMark && (
                <View style={{ backgroundColor: colors.primary + '15', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Tu marca</Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
                      {myMark.value} {UNIT_LABELS[ex.unit] || ex.unit}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setMarkValue(String(myMark.value))
                      setMarkingExerciseId(ex.id)
                    }}
                    style={{ backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Actualizar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Inline register mark input */}
              {isMarking ? (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <TextInput
                      value={markValue}
                      onChangeText={setMarkValue}
                      placeholder={`Valor en ${UNIT_LABELS[ex.unit] || ex.unit}`}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      autoFocus
                      style={{
                        flex: 1, backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 14,
                        borderWidth: 1, borderColor: colors.border, fontSize: 16,
                      }}
                    />
                    <TouchableOpacity
                      onPress={handleSaveMark}
                      disabled={!markValue.trim() || savingMark}
                      style={{
                        backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14,
                        opacity: (!markValue.trim() || savingMark) ? 0.6 : 1,
                      }}
                    >
                      {savingMark ? (
                        <ActivityIndicator size="small" color={colors.text} />
                      ) : (
                        <Text style={{ color: colors.text, fontWeight: '600' }}>Guardar</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setMarkingExerciseId(null); setMarkValue('') }}
                      style={{ padding: 10 }}
                    >
                      <Text style={{ color: colors.textSecondary }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              ) : !myMark ? (
                <TouchableOpacity
                  onPress={() => {
                    setMarkValue('')
                    setMarkingExerciseId(ex.id)
                  }}
                  style={{
                    backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 10,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    + Registrar marca
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Top 3 ranking */}
              {top.length > 0 ? (
                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>Ranking top 3</Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/(app)/groups/${groupId}/exercises/${ex.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 70 }}>
                      {top.slice(0, 3).map((record: any, index: number) => {
                        const heights = [64, 46, 32]
                        return (
                          <View key={record.id} style={{ alignItems: 'center', width: 80 }}>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{record.value}</Text>
                            <View style={{
                              width: 44,
                              height: heights[index],
                              backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                              borderRadius: 8,
                              marginVertical: 4,
                            }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>{record.user.name}</Text>
                          </View>
                        )
                      })}
                    </View>
                    <Text style={{ color: colors.primary, fontSize: 12, textAlign: 'center', marginTop: 4 }}>Ver ranking completo ›</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                !isMarking && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                    Sin marcas registradas aún
                  </Text>
                )
              )}
            </View>
          )
        }}
      />

      {/* Create exercise modal */}
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
