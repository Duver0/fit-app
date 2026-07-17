import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { GROUP_QUERY, INVITE_TO_GROUP_MUTATION } from '../../../../src/lib/graphql'

export default function MembersScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const { data, loading, refetch } = useQuery(GROUP_QUERY, { variables: { id: groupId } })
  const [inviteMutation, { loading: inviting }] = useMutation(INVITE_TO_GROUP_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })

  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')

  const group = data?.group

  const handleInvite = async () => {
    if (!email.trim()) return
    try {
      const result = await inviteMutation({ variables: { groupId, inviteeEmail: email.trim() } })
      if (result.errors?.[0]) {
        Alert.alert('Error', result.errors[0].message)
        return
      }
      Alert.alert('Invitación enviada', `Se invitó a ${email.trim()} correctamente.`)
      setShowInvite(false)
      setEmail('')
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error al invitar'
      Alert.alert('Error', msg)
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Invitar miembro</Text>
              <TouchableOpacity onPress={() => { setShowInvite(false); setEmail('') }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Instruction */}
            <View style={{
              backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 16,
              borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.primary,
            }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Ingresá el <Text style={{ fontWeight: '600', color: colors.text }}>correo electrónico</Text> de la persona.
                Si está registrada en la app, recibirá una invitación para unirse al grupo.
                Podrá elegir si acepta o rechaza.
              </Text>
            </View>

            <TextInput
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textSecondary}
              value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
              style={{
                backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16,
                borderWidth: 1, borderColor: colors.border, fontSize: 16,
              }}
            />

            <TouchableOpacity
              onPress={handleInvite}
              disabled={!email.trim() || inviting}
              style={{
                backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
                opacity: (!email.trim() || inviting) ? 0.6 : 1,
              }}
            >
              {inviting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={{ color: colors.text, fontWeight: '600' }}>Enviar invitación</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setShowInvite(false); setEmail('') }} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
