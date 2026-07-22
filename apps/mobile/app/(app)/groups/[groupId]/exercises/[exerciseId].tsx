import { useState, useCallback, useRef } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Image, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { useRanking } from '../../../../../src/hooks/useRanking'
import { useDisputes } from '../../../../../src/hooks/useDisputes'
import { useAuth } from '../../../../../src/hooks/useAuth'
import { useQuery, useMutation } from '@apollo/client'
import { client } from '../../../../../src/lib/apollo'
import { GROUP_QUERY, EXERCISES_QUERY, DELETE_EXERCISE_MUTATION, UPDATE_EXERCISE_MUTATION, ENRICH_EXERCISE_MUTATION, CHANGE_EXERCISE_CATEGORY_MUTATION } from '../../../../../src/lib/graphql'
import { getImageUrl } from '../../../../../src/lib/api'
import { ExerciseDbSearchModal } from '../../../../../src/components/ui/ExerciseDbSearchModal'
import ConfirmModal from '../../../../../src/components/ui/ConfirmModal'
import { showSuccessToast, showErrorToast } from '../../../../../src/lib/toast'
import ScreenHeader from '../../../../../src/components/ui/ScreenHeader'

const KG_TO_LB = 2.20462

function kgToLb(kg: number): number { return Math.round(kg * KG_TO_LB * 100) / 100 }
function lbToKg(lb: number): number { return Math.round(lb / KG_TO_LB * 100) / 100 }

const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', REPS_AND_WEIGHT: 'reps + peso', MIN: 'min', SEC: 'seg', M: 'm' }

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

export default function ExerciseDetailScreen() {
  const { colors } = useTheme()
  const { groupId, exerciseId } = useLocalSearchParams<{ groupId: string; exerciseId: string }>()
  const { ranking, myPerformance, isLoading, isUpserting, error, refetch, upsertPerformance, createDispute } = useRanking(exerciseId!)
  const { data: groupData } = useQuery(GROUP_QUERY, { variables: { id: groupId } })
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
  const [changingCategory, setChangingCategory] = useState(false)

  const { disputes, isLoading: disputesLoading, isVoting, vote } = useDisputes(disputeVotingPerformanceId || '')

  const exercise = groupData?.group?.exercises?.find((e: any) => e.id === exerciseId)

  const [deleteExercise, { loading: deleting }] = useMutation(DELETE_EXERCISE_MUTATION)

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

  const handleDeleteExercise = () => {
    setShowMenu(false)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false)
    setDeletingExercise(true)
    console.log('[DeleteExercise] iniciando eliminación | exerciseId:', exerciseId)
    try {
      // Usar el client directamente para tener más control sobre el error
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
      // Refrescar queries del dashboard (best-effort, no bloquea)
      client.refetchQueries({ include: ['Group', 'Exercises'] }).catch(() => {})
      showSuccessToast('Ejercicio eliminado')
      router.back()
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
      // Reabrir confirmación para que el usuario pueda reintentar
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

  // Split ranking into top 3 and rest
  const top3 = ranking.filter((r: any) => r.rank <= 3)
  const rest = ranking.filter((r: any) => r.rank > 3)

  const handleUpsert = async () => {
    const isRepsAndWeight = exercise?.unit === 'REPS_AND_WEIGHT'
    const isWeight = exercise?.unit === 'KG'

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

  const renderRankingItem = (item: any, index: number) => {
    const isMe = currentUser && item.user?.id === currentUser.id
    const isPodium = item.rank <= 3

    return (
      <View key={item.id} style={{
        backgroundColor: isMe ? colors.primary + '12' : colors.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isMe ? colors.primary + '30' : colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        {/* Rank */}
        <View style={{ width: 40, alignItems: 'center' }}>
          {isPodium ? (
            <Ionicons name="trophy" size={20} color={MEDAL_COLORS[item.rank]} />
          ) : (
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>
              #{item.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: item.rank <= 3 ? MEDAL_COLORS[item.rank] + '40' : colors.accent,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 10,
        }}>
          {getImageUrl(item.user?.avatarUrl) ? (
            <Image
              source={{ uri: getImageUrl(item.user?.avatarUrl) }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
              {item.user?.name?.charAt(0) || '?'}
            </Text>
          )}
        </View>

        {/* Name */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '500', fontSize: 15 }} numberOfLines={1}>
            {item.user?.name || 'Usuario'}
          </Text>
          {isMe && (
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '500' }}>Tú</Text>
          )}
        </View>

        {/* Value */}
        {item.reps != null && item.weight != null ? (
          <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              {item.reps} × {item.weight} kg
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              Vol: {item.value}
            </Text>
          </View>
        ) : exercise?.unit === 'KG' ? (
          <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              {item.value} kg
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              {kgToLb(item.value)} lb
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginRight: 8 }}>
            {item.value} {unitLabel}
          </Text>
        )}

        {/* Dispute buttons */}
        <TouchableOpacity
          onPress={() => setDisputeVotingPerformanceId(item.id)}
          style={{ backgroundColor: colors.primary + '20', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginRight: 4 }}
        >
          <Text style={{ color: colors.primary, fontSize: 11 }}>Disputas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowDispute(item.id)}
          style={{ backgroundColor: colors.error + '20', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}
        >
          <Text style={{ color: colors.error, fontSize: 11 }}>Disputar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={exercise?.name || 'Ejercicio'}
        rightAction={(
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      />

      {/* Dropdown menu como Modal para que flote sobre todo sin superponerse */}
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

      <FlatList
        data={ranking}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* Header with image: imageUrl o inicial */}
            <View style={{ padding: 24, paddingBottom: 16, alignItems: 'center' }}>
              {getImageUrl(exercise?.imageUrl) ? (
                <Image
                  source={{ uri: getImageUrl(exercise?.imageUrl) }}
                  style={{ width: 120, height: 120, borderRadius: 24, marginBottom: 16 }}
                  resizeMode="cover"
                />
              ) : (
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
              )}
              <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.text, textAlign: 'center' }}>
                {exercise?.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 4 }}>
                Unidad: {unitLabel}
              </Text>

              {/* Wger instructions */}
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
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                    Instrucciones
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                    {exercise.wgerInstructions}
                  </Text>
                </View>
              )}

            </View>

            {/* My performance card */}
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              {myPerformance ? (
                <TouchableOpacity
                  onPress={() => {
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
                  }}
                  style={{
                    backgroundColor: colors.primary + '15',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.primary + '30',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Tu marca</Text>
                    {exercise?.unit === 'REPS_AND_WEIGHT' && myPerformance.reps != null && myPerformance.weight != null ? (
                      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>
                        {myPerformance.reps} reps × {myPerformance.weight} kg
                      </Text>
                    ) : exercise?.unit === 'KG' ? (
                      <View>
                        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>
                          {myPerformance.value} kg
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          {kgToLb(myPerformance.value)} lb
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>
                        {myPerformance.value} {unitLabel}
                      </Text>
                    )}
                    {exercise?.unit === 'REPS_AND_WEIGHT' && (
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                        Volumen: {myPerformance.value}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Actualizar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowUpsert(true)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 24,
                    padding: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
                    + Registrar marca
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Top 3 destacado */}
            {top3.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="trophy" size={22} color={colors.primary} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                    Top 3 destacado
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 200 }}>
                  {[2, 1, 3].map((pos) => {
                    const record = top3.find((r: any) => r.rank === pos)
                    if (!record) return <View key={pos} style={{ width: 100 }} />
                    const barHeight = pos === 1 ? 80 : pos === 2 ? 60 : 40
                    return (
                      <View key={record.id} style={{ alignItems: 'center', width: 100 }}>
                        <Ionicons name="trophy" size={28} color={MEDAL_COLORS[pos]} style={{ marginBottom: 6 }} />
                        {record.reps != null && record.weight != null ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>
                              {record.reps} × {record.weight}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                              Vol: {record.value}
                            </Text>
                          </View>
                        ) : exercise?.unit === 'KG' ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>
                              {record.value} kg
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                              {kgToLb(record.value)} lb
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>
                            {record.value} {unitLabel}
                          </Text>
                        )}
                        <View style={{
                          width: 50,
                          height: barHeight,
                          backgroundColor: MEDAL_COLORS[pos],
                          borderRadius: 10,
                          marginBottom: 6,
                          opacity: 0.8,
                        }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: MEDAL_COLORS[pos] + '60',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 4,
                          }}>
                            {getImageUrl(record.user?.avatarUrl) ? (
                              <Image
                                source={{ uri: getImageUrl(record.user?.avatarUrl) }}
                                style={{ width: 24, height: 24, borderRadius: 12 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={{ color: colors.text, fontSize: 10, fontWeight: '600' }}>
                                {record.user?.name?.charAt(0) || '?'}
                              </Text>
                            )}
                          </View>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                            {record.user?.name || 'Usuario'}
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Ranking completo header */}
            {ranking.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
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
        renderItem={({ item }: any) => renderRankingItem(item, item.rank)}
      />

      {/* Upsert Modal */}
      <Modal visible={showUpsert} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
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
          </View>
        </View>
      </Modal>

      {/* Create Dispute Modal */}
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

      {/* Dispute Voting Modal */}
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
                      {/* Initiated by + status badge */}
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

                      {/* Reason */}
                      <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 12, fontStyle: 'italic' }}>
                        "{dispute.reason}"
                      </Text>

                      {/* Vote tally */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          {rebuttalVotes} refutan  ·  {keepVotes} mantienen
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 12 }}>
                          ({dispute.votes?.length || 0} voto{(dispute.votes?.length || 0) !== 1 ? 's' : ''})
                        </Text>
                      </View>

                      {/* Resolved state */}
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

                      {/* Active voting UI */}
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

            {/* Voting in progress indicator */}
            {!disputesLoading && disputes.length > 0 && (
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
                Votación abierta hasta que expire el plazo o se alcance la mayoría
              </Text>
            )}

            <TouchableOpacity onPress={() => setDisputeVotingPerformanceId(null)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Exercise Modal */}
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

      {/* Change category modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Cambiar categoría</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                Categoría actual: {exercise?.category?.name || 'Sin categoría'}
              </Text>

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
