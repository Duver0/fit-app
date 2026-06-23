import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../src/theme/ThemeProvider'
import { MY_INVITATIONS_QUERY, ACCEPT_INVITATION_MUTATION, DECLINE_INVITATION_MUTATION } from '../../../src/lib/graphql'

export default function InvitationsScreen() {
  const { colors } = useTheme()
  const { data, loading, refetch } = useQuery(MY_INVITATIONS_QUERY)
  const [acceptMutation] = useMutation(ACCEPT_INVITATION_MUTATION, { refetchQueries: [{ query: MY_INVITATIONS_QUERY }] })
  const [declineMutation] = useMutation(DECLINE_INVITATION_MUTATION, { refetchQueries: [{ query: MY_INVITATIONS_QUERY }] })

  const invitations = data?.myInvitations || []

  const handleAccept = async (id: string) => {
    try {
      await acceptMutation({ variables: { invitationId: id } })
    } catch (e: any) {
      console.error(e)
    }
  }

  const handleDecline = async (id: string) => {
    try {
      await declineMutation({ variables: { invitationId: id } })
    } catch (e: any) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Invitaciones</Text>

        <FlatList
          data={invitations}
          keyExtractor={(item: any) => item.id}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: colors.textSecondary }}>No tienes invitaciones pendientes</Text>
            </View>
          }
          renderItem={({ item }: any) => (
            <View style={{
              backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{item.group.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>{item.group.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Invitado por {item.inviter.name}</Text>
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
      </View>
    </View>
  )
}
