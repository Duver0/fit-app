import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/theme/ThemeProvider'
import {
  ROUTINE_DAY_QUERY,
  ADD_EXERCISE_TO_DAY_MUTATION,
  REMOVE_EXERCISE_FROM_DAY_MUTATION,
  REORDER_EXERCISES_MUTATION,
  UPSERT_PERFORMANCE_MUTATION,
  MY_EXERCISES_FOR_ROUTINE_QUERY,
  UPDATE_ROUTINE_DAY_NAME_MUTATION,
  MY_GROUPS_QUERY,
  CREATE_EXERCISE_MUTATION,
  EXERCISE_CATEGORIES_QUERY,
} from '../../../src/lib/graphql'
import ScreenHeader from '../../../src/components/ui/ScreenHeader'
import { Skeleton } from '../../../src/components/ui/Skeleton'
import { ErrorState } from '../../../src/components/ui/ErrorState'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import ConfirmModal from '../../../src/components/ui/ConfirmModal'
import BottomSheetModal from '../../../src/components/ui/BottomSheetModal'
import { showSuccessToast, showErrorToast } from '../../../src/lib/toast'

const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  REPS: 'reps',
  REPS_AND_WEIGHT: 'reps + peso',
  MIN: 'min',
  SEC: 'seg',
  M: 'm',
}

const UNIT_OPTIONS = ['KG', 'REPS', 'REPS_AND_WEIGHT', 'MIN', 'SEC', 'M'] as const

function formatPerformance(perf: any, unit: string): string {
  if (!perf) return '—'
  if (unit === 'REPS_AND_WEIGHT' && perf.reps != null && perf.weight != null) {
    return `${perf.reps} × ${perf.weight} kg`
  }
  const label = UNIT_LABELS[unit] || unit
  return `${perf.value} ${label}`
}

export default function RoutineDayScreen() {
  const { colors } = useTheme()
  const { day } = useLocalSearchParams<{ day: string }>()
  const dayOfWeek = parseInt(day ?? '0', 10)

  // --- Queries ---
  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(ROUTINE_DAY_QUERY, {
    variables: { dayOfWeek },
  })

  const routineDay = data?.routineDay
  const dayName = routineDay?.name || DAY_NAMES[dayOfWeek] || 'Día'

  // --- Mutations ---
  const [addExerciseToDay, { loading: addingExercise }] = useMutation(
    ADD_EXERCISE_TO_DAY_MUTATION,
    {
      refetchQueries: [
        { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } },
        'MyRoutineDays',
      ],
      onCompleted: () => showSuccessToast('Ejercicio agregado a la rutina'),
      onError: (e) => showErrorToast(e.message),
    },
  )

  const [removeExerciseFromDay, { loading: removingExercise }] = useMutation(
    REMOVE_EXERCISE_FROM_DAY_MUTATION,
    {
      refetchQueries: [
        { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } },
        'MyRoutineDays',
      ],
      onCompleted: () => showSuccessToast('Ejercicio eliminado de la rutina'),
      onError: (e) => showErrorToast(e.message),
    },
  )

  const [reorderExercises, { loading: reordering }] = useMutation(
    REORDER_EXERCISES_MUTATION,
    {
      refetchQueries: [
        { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } },
      ],
      onError: (e) => showErrorToast(e.message),
    },
  )

  const [updateDayName] = useMutation(UPDATE_ROUTINE_DAY_NAME_MUTATION, {
    refetchQueries: [
      { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } },
      'MyRoutineDays',
    ],
    onCompleted: () => showSuccessToast('Nombre actualizado'),
    onError: (e) => showErrorToast(e.message),
  })

  const [upsertPerformance] = useMutation(UPSERT_PERFORMANCE_MUTATION, {
    refetchQueries: [
      { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } },
    ],
    onCompleted: () => showSuccessToast('Marca actualizada'),
    onError: (e) => showErrorToast(e.message),
  })

  // --- Local state ---
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [dayNameInput, setDayNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [showEditMark, setShowEditMark] = useState<{ exerciseId: string; exerciseName: string; unit: string; currentPerf: any } | null>(null)

  // Edit mark form state
  const [editValue, setEditValue] = useState('')
  const [editReps, setEditReps] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [savingMark, setSavingMark] = useState(false)

  // Add exercise modal tabs: 'groups' | 'create'
  const [addTab, setAddTab] = useState<'groups' | 'create'>('groups')

  // Create exercise form state
  const [newExName, setNewExName] = useState('')
  const [newExUnit, setNewExUnit] = useState('KG')
  const [newExGroupId, setNewExGroupId] = useState('')
  const [newExCategoryId, setNewExCategoryId] = useState('')
  const [creatingExercise, setCreatingExercise] = useState(false)

  // Available exercises (from user's groups where they have marks)
  const {
    data: availableData,
    loading: loadingAvailable,
  } = useQuery(MY_EXERCISES_FOR_ROUTINE_QUERY)

  // User's groups for creating exercises
  const { data: groupsData } = useQuery(MY_GROUPS_QUERY)
  const myGroups = groupsData?.myGroups || []

  // Auto-select group if only one
  const effectiveGroupId = newExGroupId || (myGroups.length === 1 ? myGroups[0].id : '')

  // Categories for selected group
  const { data: categoriesData } = useQuery(EXERCISE_CATEGORIES_QUERY, {
    variables: { groupId: effectiveGroupId },
    skip: !effectiveGroupId,
  })
  const categories = categoriesData?.exerciseCategories || []

  const exercises = data?.routineDay?.exercises || []
  const allAvailableExercises = availableData?.myExercisesForRoutine || []

  // Filter out exercises already in this day + apply search filter
  const existingIds = new Set(exercises.map((e: any) => e.exercise.id))
  const query = searchQuery.toLowerCase().trim()
  const availableExercises = allAvailableExercises.filter(
    (ex: any) =>
      !existingIds.has(ex.id) &&
      (!query || ex.name.toLowerCase().includes(query)),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  // --- Handlers ---
  const handleAddExercise = async (exerciseId: string) => {
    try {
      await addExerciseToDay({ variables: { dayOfWeek, exerciseId } })
      setShowAddModal(false)
      setSearchQuery('')
    } catch {
      // error handled by onError callback
    }
  }

  const handleRemoveExercise = async () => {
    if (!showRemoveConfirm) return
    try {
      await removeExerciseFromDay({
        variables: { dayOfWeek, exerciseId: showRemoveConfirm },
      })
      setShowRemoveConfirm(null)
    } catch {
      // error handled by onError callback
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const exerciseIds = exercises.map((e: any) => e.exercise.id)
    const newOrder = [...exerciseIds]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    reorderExercises({ variables: { dayOfWeek, exerciseIds: newOrder } })
  }

  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return
    const exerciseIds = exercises.map((e: any) => e.exercise.id)
    const newOrder = [...exerciseIds]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    reorderExercises({ variables: { dayOfWeek, exerciseIds: newOrder } })
  }

  const handleStartEditName = () => {
    setDayNameInput(routineDay?.name || '')
    setEditingName(true)
  }

  const handleSaveName = async () => {
    setSavingName(true)
    try {
      await updateDayName({
        variables: { dayOfWeek, name: dayNameInput.trim() || null },
      })
      setEditingName(false)
    } catch {
      // handled by onError
    } finally {
      setSavingName(false)
    }
  }

  const handleOpenEditMark = (item: any) => {
    const perf = item.myPerformance
    setShowEditMark({
      exerciseId: item.exercise.id,
      exerciseName: item.exercise.name,
      unit: item.exercise.unit,
      currentPerf: perf,
    })

    if (item.exercise.unit === 'REPS_AND_WEIGHT') {
      setEditReps(perf?.reps?.toString() || '')
      setEditWeight(perf?.weight?.toString() || '')
      setEditValue('')
    } else {
      setEditValue(perf?.value?.toString() || '')
      setEditReps('')
      setEditWeight('')
    }
  }

  const handleSaveMark = async () => {
    if (!showEditMark) return
    setSavingMark(true)
    try {
      const { exerciseId, unit } = showEditMark
      if (unit === 'REPS_AND_WEIGHT') {
        const reps = parseInt(editReps, 10)
        const weight = parseFloat(editWeight)
        if (isNaN(reps) || isNaN(weight) || reps < 1 || weight <= 0) {
          showErrorToast('Valores inválidos')
          return
        }
        await upsertPerformance({
          variables: {
            input: {
              exerciseId,
              value: 0,
              reps,
              weight,
            },
          },
        })
      } else {
        const value = parseFloat(editValue)
        if (isNaN(value) || value <= 0) {
          showErrorToast('Valor inválido')
          return
        }
        await upsertPerformance({
          variables: {
            input: {
              exerciseId,
              value,
            },
          },
        })
      }
      setShowEditMark(null)
      setEditValue('')
      setEditReps('')
      setEditWeight('')
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    } finally {
      setSavingMark(false)
    }
  }

  const [createExerciseMutation] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: MY_EXERCISES_FOR_ROUTINE_QUERY },
      { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } },
    ],
    onError: (e) => showErrorToast(e.message),
  })

  const handleCreateExercise = async () => {
    const name = newExName.trim()
    if (!name || name.length < 2) {
      showErrorToast('El nombre debe tener al menos 2 caracteres')
      return
    }
    if (!effectiveGroupId) {
      showErrorToast('Seleccioná un grupo')
      return
    }
    setCreatingExercise(true)
    try {
      const { data: created } = await createExerciseMutation({
        variables: {
          input: {
            groupId: effectiveGroupId,
            name,
            unit: newExUnit,
            categoryId: newExCategoryId || undefined,
          },
        },
      })
      const newExerciseId = created?.createExercise?.id
      if (!newExerciseId) throw new Error('No se pudo crear el ejercicio')

      // Add to day
      await addExerciseToDay({ variables: { dayOfWeek, exerciseId: newExerciseId } })

      // Reset form
      setNewExName('')
      setNewExUnit('KG')
      setNewExGroupId('')
      setNewExCategoryId('')

      // Close modal and open edit mark
      setShowAddModal(false)
      setSearchQuery('')

      showSuccessToast('Ejercicio creado y agregado a la rutina')

      // Open edit mark after a brief delay to let refetch complete
      setTimeout(() => {
        setShowEditMark({
          exerciseId: newExerciseId,
          exerciseName: name,
          unit: newExUnit,
          currentPerf: null,
        })
        setEditValue('')
        setEditReps('')
        setEditWeight('')
      }, 500)
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    } finally {
      setCreatingExercise(false)
    }
  }

  // --- Loading state ---
  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={dayName} showBack />
        <View style={{ padding: 16, gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={80} borderRadius={16} />
          ))}
        </View>
      </View>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={dayName} showBack />
        <ErrorState
          message={error.message || 'Error al cargar los ejercicios del día'}
          onRetry={() => refetch()}
        />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with back arrow + name edit button + add button */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
        backgroundColor: colors.background,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8, padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStartEditName}
            accessibilityRole="button"
            accessibilityLabel="Editar nombre del día"
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: 20, fontWeight: '700', color: colors.text, maxWidth: '85%' }}
            >
              {dayName}
            </Text>
            <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Agregar ejercicio"
          style={{
            backgroundColor: colors.primary,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="add" size={18} color="#1A1A1A" />
          <Text style={{ color: '#1A1A1A', fontWeight: '600', fontSize: 13 }}>
            Agregar
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No hay ejercicios para este día"
            subtitle="Agrega tu primer ejercicio para empezar a construir tu rutina"
            actionLabel="Agregar ejercicio"
            onAction={() => setShowAddModal(true)}
          />
        }
        renderItem={({ item, index }: { item: any; index: number }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 12,
            }}
          >
            {/* Header: nombre + grupo */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 }}>
                  {item.exercise.name}
                </Text>
                {item.group && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {item.group.name}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <TouchableOpacity
                  onPress={() => handleMoveUp(index)}
                  disabled={index === 0 || reordering}
                  accessibilityRole="button"
                  accessibilityLabel="Mover arriba"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: index === 0 ? 0.3 : 1,
                  }}
                >
                  <Ionicons name="chevron-up" size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMoveDown(index)}
                  disabled={index === exercises.length - 1 || reordering}
                  accessibilityRole="button"
                  accessibilityLabel="Mover abajo"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: index === exercises.length - 1 ? 0.3 : 1,
                  }}
                >
                  <Ionicons name="chevron-down" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Unit + Current mark */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
              <View style={{
                backgroundColor: colors.primary + '15',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>
                  {UNIT_LABELS[item.exercise.unit] || item.exercise.unit}
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Marca: {formatPerformance(item.myPerformance, item.exercise.unit)}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => handleOpenEditMark(item)}
                accessibilityRole="button"
                accessibilityLabel="Editar marca"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: colors.primary + '20',
                }}
              >
                <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '500' }}>
                  Editar marca
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowRemoveConfirm(item.exercise.id)}
                accessibilityRole="button"
                accessibilityLabel="Eliminar de rutina"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: colors.error + '20',
                }}
              >
                <Ionicons name="trash-outline" size={14} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 13, fontWeight: '500' }}>
                  Quitar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sort order indicator */}
            <Text style={{
              position: 'absolute',
              top: 8,
              right: 74,
              color: colors.textSecondary,
              fontSize: 11,
            }}>
              #{item.sortOrder}
            </Text>
          </View>
        )}
      />

      {/* --- Edit Day Name Modal --- */}
      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 32 }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
              Personalizar nombre
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
              Dale un nombre a este día (ej: "Pecho - Tríceps")
            </Text>

            <TextInput
              value={dayNameInput}
              onChangeText={setDayNameInput}
              placeholder={DAY_NAMES[dayOfWeek] || 'Día'}
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setEditingName(false)}
                style={{
                  flex: 1,
                  borderRadius: 24,
                  padding: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '500' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                disabled={savingName}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 24,
                  padding: 14,
                  alignItems: 'center',
                  opacity: savingName ? 0.6 : 1,
                }}
              >
                {savingName ? (
                  <ActivityIndicator color="#1A1A1A" size="small" />
                ) : (
                  <Text style={{ color: '#1A1A1A', fontWeight: '600' }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Add Exercise Modal --- */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '85%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                Agregar ejercicio
              </Text>
              <TouchableOpacity
                onPress={() => { setShowAddModal(false); setSearchQuery(''); setAddTab('groups') }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, padding: 3, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setAddTab('groups')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: addTab === 'groups' ? colors.surface : 'transparent',
                }}
              >
                <Text style={{
                  color: addTab === 'groups' ? colors.text : colors.textSecondary,
                  fontWeight: addTab === 'groups' ? '600' : '400',
                  fontSize: 13,
                }}>
                  Desde grupos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAddTab('create')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: addTab === 'create' ? colors.surface : 'transparent',
                }}
              >
                <Text style={{
                  color: addTab === 'create' ? colors.text : colors.textSecondary,
                  fontWeight: addTab === 'create' ? '600' : '400',
                  fontSize: 13,
                }}>
                  Crear nuevo
                </Text>
              </TouchableOpacity>
            </View>

            {addTab === 'groups' ? (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                  Ejercicios de tus grupos donde tienes marcas registradas:
                </Text>

                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar ejercicio..."
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 12,
                  }}
                />

                {loadingAvailable ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator color={colors.primary} size="large" />
                  </View>
                ) : availableExercises.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Ionicons name="barbell-outline" size={40} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                      {allAvailableExercises.length === 0
                        ? 'No tienes marcas registradas en ningún grupo. Registra una marca primero.'
                        : 'Ya agregaste todos tus ejercicios disponibles a este día.'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={availableExercises}
                    keyExtractor={(item: any) => item.id}
                    style={{ maxHeight: 350 }}
                    renderItem={({ item }: { item: any }) => (
                      <TouchableOpacity
                        onPress={() => handleAddExercise(item.id)}
                        disabled={addingExercise}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 14,
                          backgroundColor: colors.background,
                          borderRadius: 12,
                          marginBottom: 8,
                          opacity: addingExercise ? 0.6 : 1,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: '500', fontSize: 15 }}>
                            {item.name}
                          </Text>
                          {item.group && (
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                              {item.group.name}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="add-circle" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  />
                )}
              </>
            ) : (
              <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                {/* Exercise name */}
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Nombre del ejercicio *</Text>
                <TextInput
                  value={newExName}
                  onChangeText={setNewExName}
                  placeholder="Ej: Press banca"
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 16,
                  }}
                />

                {/* Unit picker */}
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Unidad de medida *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {UNIT_OPTIONS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setNewExUnit(u)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: newExUnit === u ? colors.primary : colors.background,
                      }}
                    >
                      <Text style={{
                        color: newExUnit === u ? '#1A1A1A' : colors.text,
                        fontWeight: newExUnit === u ? '600' : '400',
                        fontSize: 13,
                      }}>
                        {UNIT_LABELS[u] || u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Group picker */}
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                  Grupo * {myGroups.length === 1 ? '(único grupo)' : ''}
                </Text>
                {myGroups.length === 0 ? (
                  <Text style={{ color: colors.error, fontSize: 13, marginBottom: 16 }}>
                    No pertenecés a ningún grupo. Creá o unite a uno primero.
                  </Text>
                ) : myGroups.length === 1 ? (
                  <View style={{
                    backgroundColor: colors.background,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <Text style={{ color: colors.text, fontSize: 15 }}>{myGroups[0].name}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {myGroups.map((g: any) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => setNewExGroupId(g.id)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: effectiveGroupId === g.id ? colors.primary : colors.background,
                        }}
                      >
                        <Text style={{
                          color: effectiveGroupId === g.id ? '#1A1A1A' : colors.text,
                          fontWeight: effectiveGroupId === g.id ? '600' : '400',
                          fontSize: 13,
                        }}>
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Category picker (optional) */}
                {categories.length > 0 && (
                  <>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                      Categoría (opcional)
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      <TouchableOpacity
                        onPress={() => setNewExCategoryId('')}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: !newExCategoryId ? colors.primary : colors.background,
                        }}
                      >
                        <Text style={{
                          color: !newExCategoryId ? '#1A1A1A' : colors.text,
                          fontWeight: !newExCategoryId ? '600' : '400',
                          fontSize: 13,
                        }}>
                          Sin categoría
                        </Text>
                      </TouchableOpacity>
                      {categories.map((c: any) => (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => setNewExCategoryId(c.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: newExCategoryId === c.id ? colors.primary : colors.background,
                          }}
                        >
                          <Text style={{
                            color: newExCategoryId === c.id ? '#1A1A1A' : colors.text,
                            fontWeight: newExCategoryId === c.id ? '600' : '400',
                            fontSize: 13,
                          }}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Create button */}
                <TouchableOpacity
                  onPress={handleCreateExercise}
                  disabled={creatingExercise || !newExName.trim() || !effectiveGroupId}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 24,
                    padding: 16,
                    alignItems: 'center',
                    marginTop: 4,
                    opacity: creatingExercise || !newExName.trim() || !effectiveGroupId ? 0.5 : 1,
                  }}
                >
                  {creatingExercise ? (
                    <ActivityIndicator color="#1A1A1A" size="small" />
                  ) : (
                    <Text style={{ color: '#1A1A1A', fontWeight: '600', fontSize: 16 }}>
                      Crear y agregar a la rutina
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* --- Remove Confirm Modal --- */}
      <ConfirmModal
        visible={!!showRemoveConfirm}
        title="Quitar ejercicio"
        message="¿Estás seguro de que querés quitar este ejercicio de tu rutina? No se eliminará tu marca registrada."
        confirmLabel={removingExercise ? 'Quitando...' : 'Quitar'}
        cancelLabel="Cancelar"
        confirmDestructive
        onConfirm={handleRemoveExercise}
        onCancel={() => setShowRemoveConfirm(null)}
      />

      {/* --- Edit Mark Modal --- */}
      <BottomSheetModal
        visible={!!showEditMark}
        onClose={() => setShowEditMark(null)}
      >
        {showEditMark && (
          <>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
              Editar marca
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20 }}>
              {showEditMark.exerciseName}
            </Text>

            {showEditMark.unit === 'REPS_AND_WEIGHT' ? (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                  Repeticiones
                </Text>
                <TextInput
                  value={editReps}
                  onChangeText={setEditReps}
                  placeholder="Ej: 6"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 18,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                  Peso (kg)
                </Text>
                <TextInput
                  value={editWeight}
                  onChangeText={setEditWeight}
                  placeholder="Ej: 50"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 18,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </>
            ) : (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                  Valor ({UNIT_LABELS[showEditMark.unit] || showEditMark.unit})
                </Text>
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="Tu marca"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 18,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </>
            )}

            <TouchableOpacity
              onPress={handleSaveMark}
              disabled={savingMark}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 24,
                padding: 16,
                alignItems: 'center',
                marginBottom: 8,
                opacity: savingMark ? 0.6 : 1,
              }}
            >
              {savingMark ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <Text style={{ color: '#1A1A1A', fontWeight: '600', fontSize: 16 }}>
                  Guardar marca
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </BottomSheetModal>
    </View>
  )
}
