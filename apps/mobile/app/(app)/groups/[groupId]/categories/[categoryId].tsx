import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { GROUP_QUERY, CREATE_EXERCISE_MUTATION, EXERCISES_QUERY, CREATE_EXERCISE_CATEGORY_MUTATION } from '../../../../../src/lib/graphql'
import { getImageUrl } from '../../../../../src/lib/api'
import { showSuccessToast, showErrorToast } from '../../../../../src/lib/toast'
import ScreenHeader from '../../../../../src/components/ui/ScreenHeader'

const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', REPS_AND_WEIGHT: 'reps + peso', MIN: 'min', SEC: 'seg', M: 'm' }

export default function CategoryExercisesScreen() {
  const { colors } = useTheme()
  const { groupId, categoryId } = useLocalSearchParams<{ groupId: string; categoryId: string }>()
  const { data: groupData, loading, refetch } = useQuery(GROUP_QUERY, {
    variables: { id: groupId },
  })
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GROUP_QUERY, variables: { id: groupId } },
      { query: EXERCISES_QUERY, variables: { groupId } },
    ],
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState('KG')

  const category = groupData?.group?.categories?.find((c: any) => c.id === categoryId)
  const exercises: any[] = groupData?.group?.exercises || []
  const categoryExercises = exercises.filter((e: any) => e.categoryId === categoryId)

  const handleCreateExercise = async () => {
    if (!exerciseName.trim()) return
    try {
      await createExercise({
        variables: {
          input: { groupId, name: exerciseName.trim(), unit: exerciseUnit, categoryId },
        },
      })
      showSuccessToast(`Ejercicio "${exerciseName.trim()}" creado`)
      setShowCreateModal(false)
      setExerciseName('')
      setExerciseUnit('KG')
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    }
  }

  const renderExerciseItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/groups/${groupId}/exercises/${item.id}`)}
      activeOpacity={0.7}
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 12, backgroundColor: colors.background,
        justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden',
      }}>
        {getImageUrl(item.imageUrl) ? (
          <Image source={{ uri: getImageUrl(item.imageUrl) }} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '700' }}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
          {UNIT_LABELS[item.unit] || item.unit}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  )

  const UNITS = ['KG', 'REPS', 'REPS_AND_WEIGHT', 'MIN', 'SEC', 'M']

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={category?.name || 'Categoría'}
        showBack
      />

      <FlatList
        data={categoryExercises}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            {/* Category info header */}
            <View style={{ alignItems: 'center', padding: 24 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary + '20',
                justifyContent: 'center', alignItems: 'center', marginBottom: 12,
              }}>
                <Ionicons name="folder" size={36} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
                {category?.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                {categoryExercises.length} {categoryExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
              </Text>
            </View>

            {/* Create exercise button */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={{
                  backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1,
                  borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>
                  + Crear ejercicio en esta categoría
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="folder-open-outline" size={40} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12, marginBottom: 4 }}>
                No hay ejercicios en esta categoría
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                Creá el primer ejercicio tocando el botón de arriba
              </Text>
            </View>
          </View>
        }
        renderItem={renderExerciseItem}
      />

      {/* Create exercise modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
                Crear ejercicio en "{category?.name}"
              </Text>

              <TextInput
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="Nombre del ejercicio"
                placeholderTextColor={colors.textSecondary}
                style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, fontSize: 16 }}
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
                    <Text style={{ color: exerciseUnit === unit ? colors.text : colors.textSecondary, fontWeight: exerciseUnit === unit ? '600' : '400' }}>
                      {UNIT_LABELS[unit]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={handleCreateExercise} disabled={!exerciseName.trim() || creating}
                style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: (!exerciseName.trim() || creating) ? 0.6 : 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{creating ? 'Creando…' : 'Crear ejercicio'}</Text>
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
