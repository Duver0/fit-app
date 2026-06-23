import { useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { useRanking } from '../../../../../src/hooks/useRanking'
import { useQuery } from '@apollo/client'
import { GROUP_QUERY } from '../../../../../src/lib/graphql'

export default function ExerciseDetailScreen() {
  const { colors } = useTheme()
  const { groupId, exerciseId } = useLocalSearchParams<{ groupId: string; exerciseId: string }>()
  const { ranking, myPerformance, isLoading, isUpserting, error, refetch, upsertPerformance, createDispute } = useRanking(exerciseId!)
  const { data: groupData } = useQuery(GROUP_QUERY, { variables: { id: groupId } })

  const [showUpsert, setShowUpsert] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [showDispute, setShowDispute] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')

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
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>{item.value}</Text>
            <TouchableOpacity
              onPress={() => setShowDispute(item.id)}
              style={{ backgroundColor: colors.error + '20', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Text style={{ color: colors.error, fontSize: 12 }}>Disputar</Text>
            </TouchableOpacity>
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

      {/* Dispute Modal */}
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
    </View>
  )
}
