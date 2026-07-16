import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../theme/ThemeProvider'
import { MY_INVITATIONS_QUERY, ACCEPT_INVITATION_MUTATION, DECLINE_INVITATION_MUTATION } from '../lib/graphql'

export default function InvitationBell() {
  const { colors } = useTheme()
  const [showModal, setShowModal] = useState(false)
  const { data, loading, refetch } = useQuery(MY_INVITATIONS_QUERY)
  const [acceptMutation] = useMutation(ACCEPT_INVITATION_MUTATION, { refetchQueries: [{ query: MY_INVITATIONS_QUERY }] })
  const [declineMutation] = useMutation(DECLINE_INVITATION_MUTATION, { refetchQueries: [{ query: MY_INVITATIONS_QUERY }] })

  const invitations = data?.myInvitations || []
  const pendingCount = invitations.length

  const handleAccept = async (id: string) => {
    try {
      await acceptMutation({ variables: { invitationId: id } })
    } catch { /* handled by Apollo */ }
  }

  const handleDecline = async (id: string) => {
    try {
      await declineMutation({ variables: { invitationId: id } })
    } catch { /* handled by Apollo */ }
  }

  return (
    <>
      <TouchableOpacity onPress={() => setShowModal(true)} style={{ marginRight: 8, position: 'relative' }}>
        <Ionicons name="notifications-outline" size={24} color={colors.text} />
        {pendingCount > 0 && (
          <View style={{
            position: 'absolute', top: -4, right: -4,
            backgroundColor: colors.error, borderRadius: 10,
            width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{
            backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, maxHeight: '80%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Invitaciones</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : invitations.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  No tenés invitaciones pendientes
                </Text>
              </View>
            ) : (
              <FlatList
                data={invitations}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: any) => (
                  <View style={{
                    backgroundColor: colors.background, borderRadius: 16, padding: 16, marginBottom: 10,
                    borderWidth: 1, borderColor: colors.border,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{
                        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
                        justifyContent: 'center', alignItems: 'center', marginRight: 12,
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                          {item.group.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{item.group.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          Invitado por {item.inviter.name}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => handleAccept(item.id)}
                        style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 24, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDecline(item.id)}
                        style={{ flex: 1, backgroundColor: colors.error + '20', borderRadius: 24, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: colors.error, fontWeight: '600' }}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  )
}
