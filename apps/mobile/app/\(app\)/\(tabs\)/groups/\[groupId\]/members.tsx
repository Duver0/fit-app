import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { GROUP_QUERY, INVITE_TO_GROUP_MUTATION } from '../../../../../src/lib/graphql'

export default function MembersScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const { data, loading, refetch } = useQuery(GROUP_QUERY, { variables: { id: groupId } })
  const [inviteMutation] = useMutation(INVITE_TO_GROUP_MUTATION, { refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }] })

  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')

  const group = data?.group

  const handleInvite = async () => {
    if (!email) return
    try {
      await inviteMutation({ variables: { groupId, inviteeEmail: email } })
      setShowInvite(false)
      setEmail('')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Miembros' }} />
      <View style={{ padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text }}>Miembros</Text>
        <TouchableOpacity onPress={() => setShowInvite(true)} style={{ backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Invitar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={group?.members || []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8,
            flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
          }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{item.user.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '500' }}>{item.user.name}</Text>
            </View>
            {item.role === 'OWNER' && (
              <View style={{ backgroundColor: colors.warning + '40', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 }}>
                <Text style={{ color: colors.text, fontSize: 12 }}>Dueño</Text>
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={showInvite} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Invitar miembro</Text>
            <TextInput
              placeholder="Email del invitado"
              placeholderTextColor={colors.textSecondary}
              value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
              style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}
            />
            <TouchableOpacity onPress={handleInvite} disabled={!email}
              style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: email ? 1 : 0.6 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Enviar invitación</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowInvite(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
