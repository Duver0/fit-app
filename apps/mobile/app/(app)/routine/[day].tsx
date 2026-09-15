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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../../src/theme/ThemeProvider'
import { useSmartBack } from '../../../src/hooks/useSmartBack'
import {
  ROUTINE_DAY_QUERY,
  ADD_EXERCISE_TO_DAY_MUTATION,
  REMOVE_EXERCISE_FROM_DAY_MUTATION,
  REORDER_EXERCISES_MUTATION,
  UPSERT_PERFORMANCE_MUTATION,
  MY_EXERCISES_FOR_ROUTINE_QUERY,
  UPDATE_ROUTINE_DAY_NAME_MUTATION,
  SWAP_ROUTINE_DAYS_MUTATION,
  DELETE_ROUTINE_DAY_MUTATION,
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
import UpsertMarkModal from '../../../src/components/ui/UpsertMarkModal'
import { showSuccessToast, showErrorToast } from '../../../src/lib/toast'
import { useAuthStore } from '../../../src/stores/authStore'
import { DAY_NAMES, DayOfWeek } from '../../../src/utils/dayHelpers'

// Convert DAY_NAMES Record to array for backward compatibility
const DAY_NAMES_ARRAY = [
  DAY_NAMES[0 as DayOfWeek],
  DAY_NAMES[1 as DayOfWeek],
  DAY_NAMES[2 as DayOfWeek],
  DAY_NAMES[3 as DayOfWeek],
  DAY_NAMES[4 as DayOfWeek],
  DAY_NAMES[5 as DayOfWeek],
  DAY_NAMES[6 as DayOfWeek],
]

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  REPS: 'reps',
  REPS_AND_WEIGHT: 'reps + peso',
  MIN: 'min',
  SEC: 'seg',
  M: 'm',
}

const KG_TO_LB = 2.20462

// LayoutAnimation no requiere plugin de babel (a diferencia de reanimated).
// En Android debe habilitarse explícitamente.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 100) / 100
}

const UNIT_OPTIONS = ['KG', 'REPS', 'REPS_AND_WEIGHT', 'MIN', 'SEC', 'M'] as const

type MarkPart = { text: string; bold: boolean }

function getMarkParts(perf: any, unit: string): MarkPart[] {
  if (!perf) return [{ text: 'Sin marca', bold: false }]
  if (unit === 'REPS_AND_WEIGHT') {
    const reps = perf.reps
    const weight = perf.weight
    if (reps != null && weight != null)
      return [
        { text: `${reps}`, bold: true },
        { text: ' reps \u00D7 ', bold: false },
        { text: `${weight}`, bold: true },
        { text: ' kg', bold: false },
      ]
    if (weight != null) return [{ text: `${weight}`, bold: true }, { text: ' kg', bold: false }]
    if (reps != null) return [{ text: `${reps}`, bold: true }, { text: ' reps', bold: false }]
    return [{ text: 'Sin marca', bold: false }]
  }
  if (unit === 'KG') {
    const v = perf.weight ?? perf.value
    if (v != null) return [{ text: `${v}`, bold: true }, { text: ' kg', bold: false }]
    return [{ text: 'Sin marca', bold: false }]
  }
  if (unit === 'REPS') {
    const v = perf.reps ?? perf.value
    if (v != null) return [{ text: `${v}`, bold: true }, { text: ' reps', bold: false }]
    return [{ text: 'Sin marca', bold: false }]
  }
  if (unit === 'MIN') {
    if (perf.value != null) return [{ text: `${perf.value}`, bold: true }, { text: ' min', bold: false }]
    return [{ text: 'Sin marca', bold: false }]
  }
  if (unit === 'SEC') {
    if (perf.value != null) return [{ text: `${perf.value}`, bold: true }, { text: ' seg', bold: false }]
    return [{ text: 'Sin marca', bold: false }]
  }
  if (unit === 'M') {
    if (perf.value != null) return [{ text: `${perf.value}`, bold: true }, { text: ' m', bold: false }]
    return [{ text: 'Sin marca', bold: false }]
  }
  // Fallback: usa UNIT_LABELS sin repetir la unidad si ya viene incluida
  const label = UNIT_LABELS[unit] || unit
  if (perf.value == null) return [{ text: 'Sin marca', bold: false }]
  return [{ text: `${perf.value}`, bold: true }, { text: ` ${label}`, bold: false }]
}

function formatMarkPlain(perf: any, unit: string): string {
  return getMarkParts(perf, unit)
    .map((p) => p.text)
    .join('')
}

// Marca con numeros en bold y unidades en regular. Dark-mode via colores inyectados.
function MarkText({
  perf,
  unit,
  baseColor,
  strongColor,
}: {
  perf: any
  unit: string
  baseColor: string
  strongColor: string
}) {
  const parts = getMarkParts(perf, unit)
  const plain = formatMarkPlain(perf, unit)
  return (
    <Text
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Marca: ${plain}`}
      numberOfLines={2}
      style={{ color: baseColor, fontSize: 13, flexShrink: 1, flexWrap: 'wrap' }}
    >
      {parts.map((p, i) =>
        p.bold ? (
          <Text key={i} style={{ fontWeight: '700', color: strongColor }}>
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        ),
      )}
    </Text>
  )
}

// Ancho fijo columna derecha: 44*3 + gap 4*2 = 140. Editar ocupa 100% (140).
const ACTION_COL_WIDTH = 44 * 3 + 4 * 2

export default function RoutineDayScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { day } = useLocalSearchParams<{ day: string }>()
  const handleBack = useSmartBack('/(app)/routine')
  const dayOfWeek = parseInt(day ?? '0', 10)
  // NOTE: hook must stay ABOVE the loading/error early returns to respect rules of hooks.
  const currentRestDay = useAuthStore(state => state.restDay)
  const isCurrentRestDay = dayOfWeek === currentRestDay

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
  const dayName = routineDay?.name || DAY_NAMES_ARRAY[dayOfWeek] || 'Día'

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

  const client = useApolloClient()

  const [reorderExercises, { loading: reordering }] = useMutation(
    REORDER_EXERCISES_MUTATION,
    {
      // Reconciliación contra el servidor; el reorder local ya se aplicó
      // de forma optimista en handleMove.
      refetchQueries: [
        { query: ROUTINE_DAY_QUERY, variables: { dayOfWeek } },
      ],
      update(cache, { data }) {
        // Normaliza la respuesta del servidor en la cache de ROUTINE_DAY_QUERY.
        const reordered = (data as any)?.reorderExercises
        if (!reordered) return
        try {
          cache.writeQuery({
            query: ROUTINE_DAY_QUERY,
            variables: { dayOfWeek },
            data: { routineDay: reordered },
          })
        } catch {
          // Si la forma del cache no coincide, refetchQueries reconcilia.
        }
      },
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

  const [swapRoutineDays] = useMutation(SWAP_ROUTINE_DAYS_MUTATION, {
    refetchQueries: ['MyRoutineDays'],
    onCompleted: () => showSuccessToast('Rutina movida'),
    onError: (e) => showErrorToast(e.message),
  })

  const [deleteRoutineDay] = useMutation(DELETE_ROUTINE_DAY_MUTATION, {
    refetchQueries: ['MyRoutineDays'],
    onCompleted: () => {
      showSuccessToast('Día eliminado')
      router.replace('/(app)/routine')
    },
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
  const [showKebabMenu, setShowKebabMenu] = useState(false)
  const [showMoveDayPicker, setShowMoveDayPicker] = useState(false)
  const [showDeleteDayConfirm, setShowDeleteDayConfirm] = useState(false)
  const [deletingDay, setDeletingDay] = useState(false)

  // Edit mark form state
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

  const handleMove = useCallback(
    async (index: number, dir: 'up' | 'down') => {
      const target = dir === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= exercises.length || reordering) return
      const newExercises = [...exercises]
      ;[newExercises[index], newExercises[target]] = [newExercises[target], newExercises[index]]
      const newOrder = newExercises.map((e: any) => e.exercise.id)

      // Snapshot para rollback en caso de error.
      let previous: any = null
      try {
        previous =
          client.readQuery({
            query: ROUTINE_DAY_QUERY,
            variables: { dayOfWeek },
          }) ?? null
      } catch {
        previous = null
      }

      // Anima el cambio de layout antes del reorder.
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)

      // Update optimista: reordena localmente en cache.
      try {
        if (previous?.routineDay) {
          client.writeQuery({
            query: ROUTINE_DAY_QUERY,
            variables: { dayOfWeek },
            data: {
              routineDay: {
                ...previous.routineDay,
                exercises: newExercises.map((e: any, i: number) => ({
                  ...e,
                  sortOrder: i + 1,
                })),
              },
            },
          })
        }
      } catch {
        // Si falla la escritura optimista, se sigue con la mutación.
      }

      try {
        await reorderExercises({ variables: { dayOfWeek, exerciseIds: newOrder } })
      } catch {
        // Rollback al estado anterior; el onError del hook ya muestra el toast.
        try {
          if (previous) {
            client.writeQuery({
              query: ROUTINE_DAY_QUERY,
              variables: { dayOfWeek },
              data: previous,
            })
          }
        } catch {
          // refetchQueries reconcilia en el siguiente ciclo.
        }
      }
    },
    [client, dayOfWeek, exercises, reorderExercises, reordering],
  )

  const handleStartEditName = () => {
    setDayNameInput(routineDay?.name || '')
    setEditingName(true)
  }

  // --- Kebab menu handlers ---
  const handleOpenAddExercise = () => {
    setShowKebabMenu(false)
    setShowAddModal(true)
  }

  const handleMoveDay = async (toDayOfWeek: number) => {
    setShowMoveDayPicker(false)
    try {
      await swapRoutineDays({
        variables: { fromDayOfWeek: dayOfWeek, toDayOfWeek },
      })
    } catch {
      // error handled by onError callback
    }
  }

  const handleDeleteDay = async () => {
    setShowDeleteDayConfirm(false)
    setDeletingDay(true)
    try {
      await deleteRoutineDay({ variables: { dayOfWeek } })
    } catch {
      // error handled by onError callback
    } finally {
      setDeletingDay(false)
    }
  }

  const handleSetRestDay = () => {
    setShowKebabMenu(false)
    const { restDay, setRestDay } = useAuthStore.getState()
    if (dayOfWeek === restDay) {
      // Ya es el día de descanso -> desmarcar (volver al default: Domingo 6)
      setRestDay(6)
      showSuccessToast('Día de descanso desmarcado')
    } else {
      setRestDay(dayOfWeek)
      showSuccessToast(`${DAY_NAMES_ARRAY[dayOfWeek]} marcado como día de descanso`)
    }
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
        <View style={{ padding: 20, gap: 16 }}>
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
      {/* Header with back arrow + name edit button + add button + kebab menu */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: insets.top + 14, paddingBottom: 8,
        backgroundColor: colors.background,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity onPress={handleBack} style={{ marginRight: 8, padding: 4 }}>
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
          onPress={() => setShowKebabMenu(true)}
          accessibilityRole="button"
          accessibilityLabel={`Opciones de ${DAY_NAMES_ARRAY[dayOfWeek]}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
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
        renderItem={({ item, index }: { item: any; index: number }) => {
          // Backend ya resuelve RoutineExercise.group (resolver -> exercise.group).
          // Fallback elegante: si no viene, se omite sin romper el layout.
          const groupName: string | null =
            item.group?.name ?? item.exercise?.group?.name ?? null
          return (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              marginBottom: 16,
            }}
          >
            {/* Main row: info (izq flexible) + acciones (der ancho fijo 140) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, flexShrink: 1, minWidth: 0, marginRight: 12 }}>
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2, flexShrink: 1, flexWrap: 'wrap' }}
                >
                  {item.exercise.name}
                </Text>
                {groupName ? (
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 2, flexShrink: 1 }}
                  >
                    {groupName}
                  </Text>
                ) : null}
                {/* Layout vertical: pill arriba, marca debajo en linea separada */}
                <View
                  style={{
                    backgroundColor: colors.primary + '15',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    alignSelf: 'flex-start',
                    flexShrink: 0,
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '500' }}>
                    {UNIT_LABELS[item.exercise.unit] || item.exercise.unit}
                  </Text>
                </View>
                <View style={{ marginTop: 6, flexShrink: 1, flexDirection: 'row' }}>
                  <MarkText
                    perf={item.myPerformance}
                    unit={item.exercise.unit}
                    baseColor={colors.textSecondary}
                    strongColor={colors.text}
                  />
                </View>
              </View>
              {/* Columna derecha fija 140 = 44*3 + gap 4*2. Editar = 100% (140). */}
              <View style={{ width: ACTION_COL_WIDTH, flexShrink: 0, alignItems: 'stretch', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%' }}>
                  <TouchableOpacity
                    onPress={() => setShowRemoveConfirm(item.exercise.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${item.exercise.name} de la rutina`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMove(index, 'up')}
                    disabled={index === 0 || reordering}
                    accessibilityRole="button"
                    accessibilityLabel={`Mover ${item.exercise.name} arriba`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.background,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: index === 0 ? 0.3 : 1,
                    }}
                  >
                    <Ionicons name="chevron-up" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMove(index, 'down')}
                    disabled={index === exercises.length - 1 || reordering}
                    accessibilityRole="button"
                    accessibilityLabel={`Mover ${item.exercise.name} abajo`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.background,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: index === exercises.length - 1 ? 0.3 : 1,
                    }}
                  >
                    <Ionicons name="chevron-down" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Actualizar: mismo ancho que la fila superior (100% de 140) */}
                <TouchableOpacity
                  onPress={() => handleOpenEditMark(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Actualizar marca de ${item.exercise.name}`}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    alignSelf: 'stretch',
                    minHeight: 48,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Ionicons name="pencil" size={16} color="#1A1A1A" />
                  <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '600' }}>
                    Actualizar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          )
        }}
        ListFooterComponent={
          exercises.length > 0 ? (
            <TouchableOpacity
              onPress={handleOpenAddExercise}
              accessibilityRole="button"
              accessibilityLabel="Agregar ejercicio"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                marginTop: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.border,
              }}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                Agregar ejercicio
              </Text>
            </TouchableOpacity>
          ) : null
        }
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
              placeholder={DAY_NAMES_ARRAY[dayOfWeek] || 'Día'}
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

      {/* --- Kebab Menu BottomSheetModal --- */}
      <BottomSheetModal
        visible={showKebabMenu}
        onClose={() => setShowKebabMenu(false)}
        maxHeightPercent={50}
        avoidKeyboard={false}
        scrollable={false}
      >
        <View style={{ gap: 4 }}>
          {/* Agregar ejercicio */}
          <TouchableOpacity
            onPress={handleOpenAddExercise}
            accessibilityRole="button"
            accessibilityLabel="Agregar ejercicio"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 16,
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 16 }}>Agregar ejercicio</Text>
          </TouchableOpacity>
          <View style={{ borderBottomWidth: 1, borderColor: colors.border }} />

          {/* Marcar como día de descanso */}
          <TouchableOpacity
            onPress={handleSetRestDay}
            accessibilityRole="button"
            accessibilityLabel={isCurrentRestDay ? 'Desmarcar día de descanso' : 'Marcar como día de descanso'}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 16,
            }}
          >
            <Ionicons name={isCurrentRestDay ? 'sunny-outline' : 'moon-outline'} size={22} color={isCurrentRestDay ? colors.warning : colors.text} />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {isCurrentRestDay ? 'Desmarcar día de descanso' : 'Marcar como día de descanso'}
            </Text>
            {isCurrentRestDay && (
              <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginLeft: 'auto' }} />
            )}
          </TouchableOpacity>
          <View style={{ borderBottomWidth: 1, borderColor: colors.border }} />

          {/* Mover día - solo si hay ejercicios */}
          {exercises.length > 0 && (
            <>
              <TouchableOpacity
                onPress={() => {
                  setShowKebabMenu(false)
                  // Show the day picker inline in the bottom sheet
                  setShowMoveDayPicker(true)
                }}
                accessibilityRole="button"
                accessibilityLabel="Mover día a otro día"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                }}
              >
                <Ionicons name="swap-horizontal" size={22} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 16 }}>Mover día</Text>
              </TouchableOpacity>
              <View style={{ borderBottomWidth: 1, borderColor: colors.border }} />
            </>
          )}

          {/* Eliminar día - solo si hay ejercicios */}
          {exercises.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setShowKebabMenu(false)
                setShowDeleteDayConfirm(true)
              }}
              accessibilityRole="button"
              accessibilityLabel="Eliminar día"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 16,
              }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={{ color: colors.error, fontSize: 16 }}>Eliminar día</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheetModal>

      {/* --- Move Day Picker Modal --- */}
      <Modal visible={showMoveDayPicker} transparent animationType="slide" onRequestClose={() => setShowMoveDayPicker(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                Mover rutina a otro día
              </Text>
              <TouchableOpacity
                onPress={() => setShowMoveDayPicker(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
              Mover todos los ejercicios de {dayName} a:
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {DAY_NAMES_ARRAY.map((name, index) => {
                const isCurrent = index === dayOfWeek
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleMoveDay(index)}
                    disabled={isCurrent}
                    style={{
                      width: '47%',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      opacity: isCurrent ? 0.4 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '500', fontSize: 14 }}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
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
                  Todos los ejercicios de tus grupos. Los que no tienen marca se agregan con valor 0.
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
                    fontSize: 16,
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
                        ? 'No hay ejercicios en tus grupos. Creá uno nuevo.'
                        : 'Ya agregaste todos los ejercicios disponibles a este día.'}
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
                          {!item.myPerformance && (
                            <Text style={{ color: colors.warning, fontSize: 11, marginTop: 2 }}>
                              Sin marca registrada
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
                    fontSize: 16,
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
      {showEditMark && (
        <UpsertMarkModal
          visible
          onClose={() => setShowEditMark(null)}
          onSave={async (data) => {
            setSavingMark(true)
            try {
              const { exerciseId } = showEditMark
              if (data.kind === 'REPS_AND_WEIGHT') {
                await upsertPerformance({
                  variables: { input: { exerciseId, value: 0, reps: data.reps, weight: data.weight } },
                })
              } else {
                await upsertPerformance({
                  variables: { input: { exerciseId, value: data.value } },
                })
              }
              setShowEditMark(null)
            } catch (e: any) {
              showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
            } finally {
              setSavingMark(false)
            }
          }}
          unit={showEditMark.unit}
          exerciseName={showEditMark.exerciseName}
          initialReps={showEditMark.currentPerf?.reps?.toString() || ''}
          initialWeight={showEditMark.currentPerf?.weight?.toString() || ''}
          initialWeightLb={showEditMark.currentPerf?.weight ? kgToLb(showEditMark.currentPerf.weight).toString() : ''}
          initialValue={showEditMark.currentPerf?.value?.toString() || ''}
          initialValueLb={showEditMark.currentPerf?.value ? kgToLb(showEditMark.currentPerf.value).toString() : ''}
          isSaving={savingMark}
        />
      )}

      {/* --- Delete Day Confirm Modal --- */}
      <ConfirmModal
        visible={showDeleteDayConfirm}
        title="Eliminar día"
        message={`¿Estás seguro de que querés eliminar ${dayName}? Se quitarán ${exercises.length} ejercicio(s) de tu rutina. Tus marcas se conservan.`}
        confirmLabel={deletingDay ? 'Eliminando...' : 'Eliminar día'}
        cancelLabel="Cancelar"
        confirmDestructive
        onConfirm={handleDeleteDay}
        onCancel={() => setShowDeleteDayConfirm(false)}
      />
    </View>
  )
}
