import { useState, useCallback } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTheme } from '../../../../../../src/theme/ThemeProvider'
import { useRanking } from '../../../../../../src/hooks/useRanking'
import { useDisputes } from '../../../../../../src/hooks/useDisputes'
import { useAuth } from '../../../../../../src/hooks/useAuth'
import { useQuery } from '@apollo/client'
import { GROUP_QUERY } from '../../../../../../src/lib/graphql'

export default function ExerciseDetailScreen() {
  const { colors } = useTheme()
  const { groupId, exerciseId } = useLocalSearchParams<{ groupId: string; exerciseId: string }>()
  const { ranking, myPerformance, isLoading, isUpserting, error, refetch, upsertPerformance, createDispute } = useRanking(exerciseId!)
  const { data: groupData } = useQuery(GROUP_QUERY, { variables: { id: groupId } })
  const { user: currentUser } = useAuth()

  const [showUpsert, setShowUpsert] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [showDispute, setShowDispute] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeVotingPerformanceId, setDisputeVotingPerformanceId] = useState<string | null>(null)

  const { disputes, isLoading: disputesLoading, isVoting, vote } = useDisputes(disputeVotingPerformanceId || '')

  const exercise = groupData?.group?.exercises?.find((e: any) => e.id === exerciseId)

  const handleUpsert = async () => {
    if (!newValue) return
    try {
      await upsertPerformance(parseFloat(newValue))
      setShowUpsert(false)
      setNewValue('')
    } catch (e: any) {
      console.error(e)
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: exercise?.name || 'Ejercicio' }} />

      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>{exercise?.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Unidad: {exercise?.unit}</Text>
      </View>

      {myPerformance && (
        <TouchableOpacity
          onPress={() => { setNewValue(myPerformance.value.toString()); setShowUpsert(true) }}
          style={{
            marginHorizontal: 16, marginBottom: 16,
            backgroundColor: colors.surface, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Tu marca</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>{myPerformance.value}</Text>
          </View>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Actualizar</Text>
        </TouchableOpacity>
      )}

      {!myPerformance && (
        <TouchableOpacity
          onPress={() => setShowUpsert(true)}
          style={{
            marginHorizontal: 16, marginBottom: 16,
            backgroundColor: colors.primary, borderRadius: 24, padding: 14, alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Registrar marca</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={ranking}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: colors.textSecondary }}>No hay marcas registradas aún</Text>
          </View>
        }
        renderItem={({ item, index }: any) => (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8,
            borderWidth: 1, borderColor: colors.border,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <Text style={{
              width: 32, textAlign: 'center', fontWeight: 'bold', fontSize: 16,
              color: item.rank <= 3 ? colors.primary : colors.textSecondary,
            }}>
              #{item.rank}
            </Text>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.user.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '500' }}>{item.user.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>{item.value}</Text>
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
          </View>
        )}
      />

      {/* Upsert Modal */}
      <Modal visible={showUpsert} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
              {myPerformance ? 'Actualizar marca' : 'Registrar marca'}
            </Text>
            <TextInput
              placeholder={`Valor en ${exercise?.unit || 'kg'}`}
              placeholderTextColor={colors.textSecondary}
              value={newValue} onChangeText={setNewValue}
              keyboardType="decimal-pad"
              style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}
            />
            <TouchableOpacity onPress={handleUpsert} disabled={isUpserting || !newValue}
              style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: isUpserting ? 0.6 : 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{isUpserting ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowUpsert(false)} style={{ padding: 12, alignItems: 'center' }}>
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
    </View>
  )
}
