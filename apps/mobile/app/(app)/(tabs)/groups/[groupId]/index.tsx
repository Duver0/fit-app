import { useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { GROUP_QUERY, TOP3_RANKING_QUERY, CREATE_EXERCISE_MUTATION } from '../../../../../src/lib/graphql'

const UNITS = ['KG', 'REPS', 'MIN', 'SEC', 'M'] as const
const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', MIN: 'min', SEC: 'seg', M: 'm' }

export default function GroupDashboardScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()

  const { data: groupData, loading: groupLoading, refetch: refetchGroup } = useQuery(GROUP_QUERY, {
    variables: { id: groupId },
  })
  const { data: rankingData, loading: rankingLoading, refetch: refetchRanking } = useQuery(TOP3_RANKING_QUERY, {
    variables: { groupId },
  })
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GROUP_QUERY, variables: { id: groupId } },
      { query: TOP3_RANKING_QUERY, variables: { groupId } },
    ],
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState<string>('KG')

  const group = groupData?.group
  const exercises = group?.exercises || []
  const top3Data = rankingData?.top3Ranking || []
  const isLoading = groupLoading || rankingLoading

  const handleRefetch = () => {
    refetchGroup()
    refetchRanking()
  }

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
      <Stack.Screen options={{ title: group?.name || 'Grupo' }} />

      <FlatList
        data={top3Data}
        keyExtractor={(item: any) => item.exercise.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* Group header */}
            <View style={{ padding: 24, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
                    justifyContent: 'center', alignItems: 'center', marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                      {group?.name?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text }}>{group?.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                      {group?.memberCount} miembros
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push(`/(app)/(tabs)/groups/${groupId}/members`)}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Miembros</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Create exercise button */}
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
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

            {/* Ranking section title */}
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
                Ranking por ejercicio
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16 }}>
            {exercises.length === 0 ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>
                  No hay ejercicios en este grupo aún
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  Creá el primer ejercicio para empezar a competir
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Sin marcas registradas aún
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13, marginTop: 4 }}>
                  Tocá un ejercicio para registrar tu marca
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/(tabs)/groups/${groupId}/exercises/${item.exercise.id}`)}
            style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.exercise.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{UNIT_LABELS[item.exercise.unit] || item.exercise.unit}</Text>
            </View>

            {item.top.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Sin marcas registradas</Text>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80 }}>
                {item.top.slice(0, 3).map((record: any, index: number) => {
                  const heights = [70, 50, 35]
                  return (
                    <View key={record.id} style={{ alignItems: 'center', width: 80 }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{record.value}</Text>
                      <View style={{
                        width: 48,
                        height: heights[index],
                        backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                        borderRadius: 8,
                        marginVertical: 4,
                      }} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{record.user.name}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </TouchableOpacity>
        )}
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
