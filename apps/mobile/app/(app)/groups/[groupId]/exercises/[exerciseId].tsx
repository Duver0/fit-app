import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { useRanking } from '../../../../../src/hooks/useRanking'
import { useDisputes } from '../../../../../src/hooks/useDisputes'
import { useAuth } from '../../../../../src/hooks/useAuth'
import { useSmartBack } from '../../../../../src/hooks/useSmartBack'
import { useQuery, useMutation } from '@apollo/client'
import { client } from '../../../../../src/lib/apollo'
import { seedRankingFromCache, seedPerformanceFromCache, cacheRanking, cachePerformance } from '../../../../../src/lib/exerciseCache'
import { GROUP_QUERY, EXERCISES_QUERY, DELETE_EXERCISE_MUTATION, UPDATE_EXERCISE_MUTATION, ENRICH_EXERCISE_MUTATION, CHANGE_EXERCISE_CATEGORY_MUTATION, CREATE_EXERCISE_CATEGORY_MUTATION } from '../../../../../src/lib/graphql'
import { getImageUrl } from '../../../../../src/lib/api'
import { ExerciseDbSearchModal } from '../../../../../src/components/ui/ExerciseDbSearchModal'
import ConfirmModal from '../../../../../src/components/ui/ConfirmModal'
import { showSuccessToast, showErrorToast } from '../../../../../src/lib/toast'
import BottomSheetModal from '../../../../../src/components/ui/BottomSheetModal'
import ImageWithFallback from '../../../../../src/components/ui/ImageWithFallback'
import ScreenHeader from '../../../../../src/components/ui/ScreenHeader'
import { Skeleton } from '../../../../../src/components/ui/Skeleton'
import { Podium } from '../../../../../src/components/ui/Podium'
import { RankingRow } from '../../../../../src/components/ranking/RankingRow'

const KG_TO_LB = 2.20462

function kgToLb(kg: number): number { return Math.round(kg * KG_TO_LB * 100) / 100 }
function lbToKg(lb: number): number { return Math.round(lb / KG_TO_LB * 100) / 100 }

const UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  REPS: 'reps',
  REPS_AND_WEIGHT: 'reps + peso',
  MIN: 'min',
  SEC: 'seg',
  M: 'm',
}

const PODIUM_UNIT_LABELS: Record<string, string> = {
  KG: 'kg',
  REPS: 'reps',
  REPS_AND_WEIGHT: 'pts',
  MIN: 'min',
  SEC: 'seg',
  M: 'm',
}

function ExerciseDetailSkeleton() {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Imagen del ejercicio */}
      <View style={{ padding: 24, paddingBottom: 16, alignItems: 'center' }}>
        <Skeleton width={120} height={120} borderRadius={24} style={{ marginBottom: 16 }} />
      </View>

      {/* Tu marca */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Skeleton width="100%" height={56} borderRadius={12} />
      </View>

      {/* Top 3 destacado */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Skeleton width={22} height={22} borderRadius={6} />
          <Skeleton width={150} height={18} borderRadius={4} />
        </View>
        <Skeleton width="100%" height={140} borderRadius={16} />
      </View>

      {/* Ranking completo header */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 4 }}>
        <Skeleton width={160} height={18} borderRadius={4} />
      </View>

      {/* Filas de ranking */}
      <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
        <Skeleton width="100%" height={64} borderRadius={12} />
        <Skeleton width="100%" height={64} borderRadius={12} />
        <Skeleton width="100%" height={64} borderRadius={12} />
      </View>
    </ScrollView>
  )
}

export default function ExerciseDetailScreen() {
  const { colors } = useTheme()
  const { groupId, exerciseId } = useLocalSearchParams<{ groupId: string; exerciseId: string }>()
  const exId = exerciseId!
  const handleBack = useSmartBack(`/(app)/groups/${groupId}`)

  // Al volver a un ejercicio recién visto, sembramos la caché de Apollo con
  // los datos previos para pintar al instante y evitar el skeleton.
  const seededFor = useRef<string | null>(null)
  if (seededFor.current !== exId) {
    seedRankingFromCache(exId)
    seedPerformanceFromCache(exId)
    seededFor.current = exId
  }

  const { ranking, myPerformance, isLoading, isMyPerformanceLoading, isUpserting, refetch, upsertPerformance, createDispute, rawRanking, rawMyPerformance } = useRanking(exId)
  const { data: groupData, loading: groupLoading } = useQuery(GROUP_QUERY, { variables: { id: groupId } })

  const showSkeleton = isLoading || groupLoading || isMyPerformanceLoading

  // Persistir en la caché efímera los datos ya cargados de este ejercicio.
  useEffect(() => {
    if (rawRanking) cacheRanking(exId, rawRanking)
  }, [rawRanking, exId])

  useEffect(() => {
    cachePerformance(exId, rawMyPerformance)
  }, [rawMyPerformance, exId])
  const { user: currentUser } = useAuth()

  const [showUpsert, setShowUpsert] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [newValueLb, setNewValueLb] = useState('')
  const [newReps, setNewReps] = useState('')
  const [newWeight, setNewWeight] = useState('')
  const [newWeightLb, setNewWeightLb] = useState('')
  const [showDispute, setShowDispute] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeVotingPerformanceId, setDisputeVotingPerformanceId] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [showDbSearch, setShowDbSearch] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingExercise, setDeletingExercise] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [catCreateMode, setCatCreateMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [createCategory] = useMutation(CREATE_EXERCISE_CATEGORY_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })
  const [changingCategory, setChangingCategory] = useState(false)

  const { disputes, isLoading: disputesLoading, isVoting, vote } = useDisputes(disputeVotingPerformanceId || '')

  const exercise = groupData?.group?.exercises?.find((e: any) => e.id === exerciseId)

  const [updateExercise, { loading: updating }] = useMutation(UPDATE_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GROUP_QUERY, variables: { id: groupId } },
      { query: EXERCISES_QUERY, variables: { groupId } },
    ],
  })

  const [enrichExercise] = useMutation(ENRICH_EXERCISE_MUTATION, {
    refetchQueries: [
      { query: GROUP_QUERY, variables: { id: groupId } },
      { query: EXERCISES_QUERY, variables: { groupId } },
    ],
  })

  const [changeCategoryMutation] = useMutation(CHANGE_EXERCISE_CATEGORY_MUTATION, {
    refetchQueries: [
      { query: GROUP_QUERY, variables: { id: groupId } },
      { query: EXERCISES_QUERY, variables: { groupId } },
    ],
  })

  const isOwner = currentUser?.id && (
    groupData?.group?.owner?.id === currentUser.id ||
    exercise?.createdBy?.id === currentUser.id
  )

  // --- Find current user's rank ---
  const myRankItem = ranking.find((r: any) => r.user?.id === currentUser?.id)
  const myRank = myRankItem?.rank ?? null

  // --- Top 3 data for Podium ---
  const top3 = ranking.filter((r: any) => r.rank <= 3)
  const podiumItems = top3.map((r: any) => ({
    rank: r.rank,
    name: r.user?.name || 'Usuario',
    value: r.value,
    avatarUrl: r.user?.avatarUrl,
    unitLabel: exercise ? PODIUM_UNIT_LABELS[exercise.unit] || exercise.unit : undefined,
  }))

  // --- Helpers to format the compact "Tu marca" value ---
  function formatCompactValue(perf: any): string {
    if (!exercise) return `${perf.value}`
    if (exercise.unit === 'REPS_AND_WEIGHT' && perf.reps != null && perf.weight != null) {
      return `${perf.reps} × ${perf.weight} kg`
    }
    return `${perf.value} ${UNIT_LABELS[exercise.unit] || exercise.unit}`
  }

  // --- Handlers ---
  const handleDeleteExercise = () => {
    setShowMenu(false)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false)
    setDeletingExercise(true)
    console.log('[DeleteExercise] iniciando eliminación | exerciseId:', exerciseId)
    try {
      const result = await client.mutate({
        mutation: DELETE_EXERCISE_MUTATION,
        variables: { id: exerciseId },
      })

      if (result.errors && result.errors.length > 0) {
        const msg = result.errors[0]?.message || 'Error al eliminar el ejercicio'
        console.error('[DeleteExercise] error en respuesta:', msg, result.errors)
        showErrorToast(msg)
        return
      }

      if (result.data?.deleteExercise !== true) {
        console.error('[DeleteExercise] respuesta inesperada:', result)
        showErrorToast('Error inesperado al eliminar el ejercicio')
        return
      }

      console.log('[DeleteExercise] eliminado correctamente')
      client.refetchQueries({ include: ['Group', 'Exercises'] }).catch(() => {})
      showSuccessToast('Ejercicio eliminado')
      handleBack()
    } catch (e: any) {
      const graphQLError = e?.graphQLErrors?.[0]
      const networkError = e?.networkError
      const errorMsg = graphQLError?.message || networkError?.message || e?.message || 'Error desconocido'
      console.error('[DeleteExercise] exception:', {
        message: errorMsg,
        graphQLErrors: e?.graphQLErrors,
        networkError: e?.networkError,
        stack: e?.stack,
        error: e,
      })
      showErrorToast(errorMsg)
      setShowDeleteConfirm(true)
    } finally {
      setDeletingExercise(false)
    }
  }

  const handleEditExercise = () => {
    setShowMenu(false)
    setEditName(exercise?.name || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) return
    try {
      await updateExercise({ variables: { input: { id: exerciseId, name: editName.trim() } } })
      setShowEditModal(false)
      showSuccessToast('Nombre del ejercicio actualizado')
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    }
  }

  const handleChangeImage = () => {
    setShowMenu(false)
    setShowDbSearch(true)
  }

  const handleChangeCategory = () => {
    setShowMenu(false)
    setShowCategoryModal(true)
  }

  const handleSelectFromDb = async (item: any) => {
    try {
      const imageUrl = item.image || item.thumbnail
      if (!imageUrl) {
        showErrorToast('Este ejercicio no tiene imagen disponible')
        return
      }
      await enrichExercise({
        variables: {
          id: exerciseId,
          wgerData: {
            wgerId: item.id,
            imageUrl,
            wgerCategory: item.category || undefined,
            wgerMuscles: item.muscles || undefined,
            wgerEquipment: item.equipment || undefined,
            wgerInstructions: item.description || undefined,
          },
        },
      })
      showSuccessToast('Ejercicio enriquecido desde wger')
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    }
  }

  const handleSelectStockImage = async (imageUrl: string) => {
    try {
      await updateExercise({ variables: { input: { id: exerciseId, imageUrl } } })
      showSuccessToast('Imagen actualizada')
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    }
  }

  const handleUpsert = async () => {
    const isRepsAndWeight = exercise?.unit === 'REPS_AND_WEIGHT'

    if (isRepsAndWeight) {
      if (!newReps || !newWeight) return
      const reps = parseInt(newReps, 10)
      const weight = parseFloat(newWeight)
      if (isNaN(reps) || isNaN(weight) || reps < 1 || weight <= 0) return
      try {
        await upsertPerformance(0, reps, weight)
        setShowUpsert(false)
        setNewReps('')
        setNewWeight('')
        setNewWeightLb('')
      } catch (e: any) {
        console.error(e)
      }
    } else {
      if (!newValue) return
      try {
        await upsertPerformance(parseFloat(newValue))
        setShowUpsert(false)
        setNewValue('')
        setNewValueLb('')
      } catch (e: any) {
        console.error(e)
      }
    }
  }

  const handleDispute = async () => {
    if (!showDispute || !disputeReason) return
    try {
      await createDispute(showDispute, disputeReason)
      setShowDispute(null)
      setDisputeReason('')
    } catch (e: any) {
      console.error(e)
    }
  }

  const handleVote = useCallback(async (disputeId: string, voteValue: boolean) => {
    try {
      await vote(disputeId, voteValue)
    } catch (e: any) {
      console.error(e)
    }
  }, [vote])

  const getUserVote = useCallback((dispute: any) => {
    if (!currentUser) return null
    return dispute.votes?.find((v: any) => v.user.id === currentUser.id) || null
  }, [currentUser])

  const renderDisputeStatus = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Abierta', color: colors.warning }
      case 'APPROVED':
        return { label: 'Aprobada', color: colors.success }
      case 'REJECTED':
        return { label: 'Rechazada', color: colors.error }
      default:
        return { label: status, color: colors.textSecondary }
    }
  }

  const unitLabel = exercise ? (UNIT_LABELS[exercise.unit] || exercise.unit) : ''

  // --- Convertimos a upsert pre-fill ---
  const openUpsertWithCurrent = () => {
    if (!myPerformance) { setShowUpsert(true); return }
    if (exercise?.unit === 'REPS_AND_WEIGHT') {
      setNewReps((myPerformance.reps || '').toString())
      const w = myPerformance.weight || 0
      setNewWeight(w.toString())
      setNewWeightLb(kgToLb(w).toString())
    } else {
      const val = myPerformance.value || 0
      setNewValue(val.toString())
      setNewValueLb(kgToLb(val).toString())
    }
    setShowUpsert(true)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={exercise?.name || 'Ejercicio'}
        fallbackHref={`/(app)/groups/${groupId}`}
        rightAction={(
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      />

      {/* Dropdown menu */}
      <Modal visible={showMenu} transparent animationType="none">
        <Pressable style={{ flex: 1 }} onPress={() => setShowMenu(false)}>
          <View style={{ flex: 1 }}>
            <View style={{
              position: 'absolute',
              top: 100,
              right: 16,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              minWidth: 200,
              marginBottom: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <TouchableOpacity
                onPress={handleChangeCategory}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Ionicons name="folder-outline" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 14 }}>Cambiar categoría</Text>
              </TouchableOpacity>
              {isOwner && (
                <>
                  <TouchableOpacity
                    onPress={handleEditExercise}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Ionicons name="pencil-outline" size={18} color={colors.text} />
                    <Text style={{ color: colors.text, fontSize: 14 }}>Editar nombre</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleChangeImage}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Ionicons name="image-outline" size={18} color={colors.text} />
                    <Text style={{ color: colors.text, fontSize: 14 }}>Cambiar imagen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeleteExercise}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={{ color: colors.error, fontSize: 14 }}>Eliminar ejercicio</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Confirmación de eliminación */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Eliminar ejercicio"
        message="¿Estás seguro de que querés eliminar este ejercicio? Esta acción no se puede deshacer."
        confirmLabel={deletingExercise ? 'Eliminando...' : 'Eliminar'}
        cancelLabel="Cancelar"
        confirmDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showSkeleton ? (
        <ExerciseDetailSkeleton />
      ) : (
      <FlatList
        data={ranking}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* --- HEADER: imagen, nombre, unidad, instrucciones --- */}
            <View style={{ padding: 24, paddingBottom: 16, alignItems: 'center' }}>
              <ImageWithFallback
                source={{ uri: getImageUrl(exercise?.imageUrl) }}
                style={{ width: 120, height: 120, borderRadius: 24, marginBottom: 16 }}
                resizeMode="cover"
                fallback={
                  <View style={{
                    width: 120,
                    height: 120,
                    borderRadius: 24,
                    backgroundColor: colors.surface,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <Text style={{ fontSize: 40, color: colors.primary, fontWeight: '700' }}>
                      {exercise?.name?.charAt(0) || '?'}
                    </Text>
                  </View>
                }
              />

              {/* Instrucciones wger */}
              {exercise?.wgerInstructions && (
                <View style={{
                  marginTop: 12,
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  width: '100%',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                </View>
              )}
            </View>

            {/* --- TU MARCA (compacto) --- */}
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              {myPerformance ? (
                <TouchableOpacity
                  onPress={openUpsertWithCurrent}
                  style={{
                    backgroundColor: colors.primary + '12',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.primary + '30',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                    <View>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                        {myRank ? `#${myRank} · ` : ''}
                        {formatCompactValue(myPerformance)}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Actualizar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowUpsert(true)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 24,
                    padding: 12,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
                    + Registrar marca
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* --- TOP 3 DESTACADO (usando Podium) --- */}
            {top3.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="trophy" size={22} color={colors.primary} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                    Top 3 destacado
                  </Text>
                </View>
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                  <Podium items={podiumItems} />
                </View>
              </View>
            )}

            {/* --- RANKING COMPLETO header --- */}
            {ranking.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                  Ranking completo ({ranking.length})
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 16 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
              No hay marcas registradas aún
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              ¡Registrá tu primera marca para empezar a competir!
            </Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <View style={{ paddingHorizontal: 16 }}>
            <RankingRow
              rank={item.rank}
              name={item.user?.name || 'Usuario'}
              value={item.value}
              avatarUrl={item.user?.avatarUrl}
              isMine={currentUser?.id === item.user?.id}
              unit={exercise?.unit}
              reps={item.reps}
              weight={item.weight}
              onViewDisputes={() => setDisputeVotingPerformanceId(item.id)}
              onDispute={() => setShowDispute(item.id)}
            />
          </View>
        )}
      />
      )}

      {/* --- Upsert Modal --- */}
      <BottomSheetModal visible={showUpsert} onClose={() => {
        setShowUpsert(false)
        setNewValue('')
        setNewValueLb('')
        setNewReps('')
        setNewWeight('')
        setNewWeightLb('')
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
          {myPerformance ? 'Actualizar marca' : 'Registrar marca'}
        </Text>

        {exercise?.unit === 'REPS_AND_WEIGHT' ? (
          <>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Repeticiones</Text>
            <TextInput
              placeholder="Ej: 6"
              placeholderTextColor={colors.textSecondary}
              value={newReps} onChangeText={setNewReps}
              keyboardType="number-pad"
              style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Peso</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  placeholder="0 kg"
                  placeholderTextColor={colors.textSecondary}
                  value={newWeight}
                  onChangeText={(t) => { setNewWeight(t); const v = parseFloat(t); if (!isNaN(v) && v > 0) setNewWeightLb(kgToLb(v).toString()); else setNewWeightLb('') }}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 10, padding: 10, fontSize: 15, borderWidth: 1, borderColor: colors.border }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  placeholder="0 lb"
                  placeholderTextColor={colors.textSecondary}
                  value={newWeightLb}
                  onChangeText={(t) => { setNewWeightLb(t); const v = parseFloat(t); if (!isNaN(v) && v > 0) setNewWeight(lbToKg(v).toString()); else setNewWeight('') }}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 10, padding: 10, fontSize: 15, borderWidth: 1, borderColor: colors.border }}
                />
              </View>
            </View>
            <TouchableOpacity onPress={handleUpsert} disabled={isUpserting || !newReps || !newWeight}
              style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: isUpserting ? 0.6 : 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{isUpserting ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </>
        ) : exercise?.unit === 'KG' ? (
          <>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Peso</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  placeholder="0 kg"
                  placeholderTextColor={colors.textSecondary}
                  value={newValue}
                  onChangeText={(t) => { setNewValue(t); const v = parseFloat(t); if (!isNaN(v) && v > 0) setNewValueLb(kgToLb(v).toString()); else setNewValueLb('') }}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 10, padding: 10, fontSize: 15, borderWidth: 1, borderColor: colors.border }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  placeholder="0 lb"
                  placeholderTextColor={colors.textSecondary}
                  value={newValueLb}
                  onChangeText={(t) => { setNewValueLb(t); const v = parseFloat(t); if (!isNaN(v) && v > 0) setNewValue(lbToKg(v).toString()); else setNewValue('') }}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 10, padding: 10, fontSize: 15, borderWidth: 1, borderColor: colors.border }}
                />
              </View>
            </View>
            <TouchableOpacity onPress={handleUpsert} disabled={isUpserting || !newValue}
              style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: isUpserting ? 0.6 : 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{isUpserting ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              placeholder={`Valor en ${unitLabel || 'kg'}`}
              placeholderTextColor={colors.textSecondary}
              value={newValue} onChangeText={setNewValue}
              keyboardType="decimal-pad"
              style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}
            />
            <TouchableOpacity onPress={handleUpsert} disabled={isUpserting || !newValue}
              style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: isUpserting ? 0.6 : 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{isUpserting ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => {
          setShowUpsert(false)
          setNewValue('')
          setNewValueLb('')
          setNewReps('')
          setNewWeight('')
          setNewWeightLb('')
        }} style={{ padding: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
        </TouchableOpacity>
      </BottomSheetModal>

      {/* --- Create Dispute Modal --- */}
      <Modal visible={!!showDispute} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
              Disputar marca
            </Text>
            <TextInput
              placeholder="Razón de la disputa"
              placeholderTextColor={colors.textSecondary}
              value={disputeReason} onChangeText={setDisputeReason}
              multiline numberOfLines={3}
              style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top' }}
            />
            <TouchableOpacity onPress={handleDispute} disabled={!disputeReason}
              style={{ backgroundColor: colors.error, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: disputeReason ? 1 : 0.6 }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar disputa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowDispute(null); setDisputeReason('') }} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Dispute Voting Modal --- */}
      <Modal visible={!!disputeVotingPerformanceId} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
              Disputas de la marca
            </Text>

            {disputesLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : disputes.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                  Sin disputas para esta marca
                </Text>
              </View>
            ) : (
              <FlatList
                data={disputes}
                keyExtractor={(d: any) => d.id}
                style={{ maxHeight: 400 }}
                renderItem={({ item: dispute }: any) => {
                  const userVote = getUserVote(dispute)
                  const rebuttalVotes = dispute.votes?.filter((v: any) => v.vote === true).length || 0
                  const keepVotes = dispute.votes?.filter((v: any) => v.vote === false).length || 0
                  const statusInfo = renderDisputeStatus(dispute.status)

                  return (
                    <View style={{
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                          Iniciada por {dispute.initiatedBy?.name || 'Usuario'}
                        </Text>
                        <View style={{
                          backgroundColor: statusInfo.color + '20',
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                        }}>
                          <Text style={{ color: statusInfo.color, fontSize: 12, fontWeight: '500' }}>
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 12, fontStyle: 'italic' }}>
                        "{dispute.reason}"
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          {rebuttalVotes} refutan  ·  {keepVotes} mantienen
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 12 }}>
                          ({dispute.votes?.length || 0} voto{(dispute.votes?.length || 0) !== 1 ? 's' : ''})
                        </Text>
                      </View>

                      {dispute.status === 'APPROVED' && (
                        <View style={{ backgroundColor: colors.success + '15', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                          <Text style={{ color: colors.success, fontWeight: '500', fontSize: 13 }}>
                            Disputa aprobada — la marca ha sido refutada
                          </Text>
                        </View>
                      )}
                      {dispute.status === 'REJECTED' && (
                        <View style={{ backgroundColor: colors.error + '15', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                          <Text style={{ color: colors.error, fontWeight: '500', fontSize: 13 }}>
                            Disputa rechazada — la marca se mantiene
                          </Text>
                        </View>
                      )}

                      {dispute.status === 'OPEN' && (
                        <>
                          {userVote ? (
                            <View style={{
                              backgroundColor: userVote.vote
                                ? colors.error + '15'
                                : colors.success + '15',
                              borderRadius: 8,
                              padding: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}>
                              <Text style={{
                                fontWeight: '600',
                                fontSize: 13,
                                color: userVote.vote ? colors.error : colors.success,
                              }}>
                                {userVote.vote
                                  ? 'Votaste por refutar esta marca'
                                  : 'Votaste por mantener esta marca'
                                }
                              </Text>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row' }}>
                              <TouchableOpacity
                                onPress={() => handleVote(dispute.id, true)}
                                disabled={isVoting}
                                style={{
                                  flex: 1,
                                  backgroundColor: colors.error,
                                  borderRadius: 24,
                                  paddingVertical: 12,
                                  alignItems: 'center',
                                  marginRight: 8,
                                  opacity: isVoting ? 0.6 : 1,
                                }}
                              >
                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                                  Refutar
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleVote(dispute.id, false)}
                                disabled={isVoting}
                                style={{
                                  flex: 1,
                                  backgroundColor: colors.success,
                                  borderRadius: 24,
                                  paddingVertical: 12,
                                  alignItems: 'center',
                                  opacity: isVoting ? 0.6 : 1,
                                }}
                              >
                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                                  Mantener
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )
                }}
              />
            )}

            <TouchableOpacity onPress={() => setDisputeVotingPerformanceId(null)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Edit Exercise Modal --- */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
              Editar ejercicio
            </Text>
            <TextInput
              placeholder="Nombre del ejercicio"
              placeholderTextColor={colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
              style={{
                backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16,
                borderWidth: 1, borderColor: colors.border, fontSize: 16,
              }}
            />
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={updating || !editName.trim()}
              style={{
                backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
                opacity: (updating || !editName.trim()) ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {updating ? 'Guardando…' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Change category modal --- */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Cambiar categoría</Text>
                {!catCreateMode && (
                  <TouchableOpacity onPress={() => setCatCreateMode(true)}>
                    <Ionicons name="add-circle" size={28} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {catCreateMode ? (
                <View style={{ marginBottom: 16 }}>
                  <TextInput
                    value={newCatName}
                    onChangeText={setNewCatName}
                    placeholder="Nombre de la nueva categoría"
                    placeholderTextColor={colors.textSecondary}
                    style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border, fontSize: 15 }}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      if (!newCatName.trim()) return
                      try {
                        await createCategory({ variables: { input: { groupId, name: newCatName.trim() } } })
                        setCatCreateMode(false)
                        setNewCatName('')
                      } catch (e: any) { showErrorToast(e?.graphQLErrors?.[0]?.message || e.message) }
                    }}
                    disabled={!newCatName.trim()}
                    style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', opacity: !newCatName.trim() ? 0.6 : 1 }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>Crear categoría</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setCatCreateMode(false); setNewCatName('') }} style={{ padding: 8, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                  Categoría actual: {exercise?.category?.name || 'Sin categoría'}
                </Text>
              )}

              {!catCreateMode && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!exercise?.categoryId) { setShowCategoryModal(false); return }
                      setChangingCategory(true)
                      try {
                        await changeCategoryMutation({ variables: { id: exerciseId, categoryId: null } })
                        showSuccessToast('Categoría removida')
                        setShowCategoryModal(false)
                      } catch (e: any) { showErrorToast(e?.graphQLErrors?.[0]?.message || e.message) }
                      finally { setChangingCategory(false) }
                    }}
                    style={{
                      backgroundColor: !exercise?.categoryId ? colors.primary : colors.background,
                      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
                      borderWidth: 1, borderColor: !exercise?.categoryId ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: !exercise?.categoryId ? colors.text : colors.textSecondary, fontWeight: !exercise?.categoryId ? '600' : '400', fontSize: 13 }}>Sin categoría</Text>
                  </TouchableOpacity>
                  {(groupData?.group?.categories || []).map((cat: any) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={async () => {
                        if (exercise?.categoryId === cat.id) { setShowCategoryModal(false); return }
                        setChangingCategory(true)
                        try {
                          await changeCategoryMutation({ variables: { id: exerciseId, categoryId: cat.id } })
                          showSuccessToast(`Categoría cambiada a "${cat.name}"`)
                          setShowCategoryModal(false)
                        } catch (e: any) { showErrorToast(e?.graphQLErrors?.[0]?.message || e.message) }
                        finally { setChangingCategory(false) }
                      }}
                      disabled={changingCategory}
                      style={{
                        backgroundColor: exercise?.categoryId === cat.id ? colors.primary : colors.background,
                        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
                        borderWidth: 1, borderColor: exercise?.categoryId === cat.id ? colors.primary : colors.border,
                        opacity: changingCategory ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: exercise?.categoryId === cat.id ? colors.text : colors.textSecondary, fontWeight: exercise?.categoryId === cat.id ? '600' : '400', fontSize: 13 }}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ExerciseDbSearchModal
        visible={showDbSearch}
        onClose={() => setShowDbSearch(false)}
        onSelect={handleSelectFromDb}
        onSelectImage={handleSelectStockImage}
      />
    </View>
  )
}
