import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useTheme } from '../../src/theme/ThemeProvider'
import { useAuthStore } from '../../src/stores/authStore'
import { showSuccessToast, showErrorToast } from '../../src/lib/toast'
import ScreenHeader from '../../src/components/ui/ScreenHeader'

const ADMIN_GROUPS = gql`
  query AdminGroups($page: Int, $limit: Int) {
    adminGroups(page: $page, limit: $limit) {
      items { id name description memberCount createdAt }
      totalCount currentPage totalPages
    }
  }
`

const ADMIN_USERS = gql`
  query AdminUsers($page: Int, $limit: Int) {
    adminUsers(page: $page, limit: $limit) {
      items { id email name role createdAt }
      totalCount currentPage totalPages
    }
  }
`

const ADMIN_DELETE_GROUP = gql`
  mutation AdminDeleteGroup($groupId: String!) { adminDeleteGroup(groupId: $groupId) }
`

const ADMIN_DELETE_USER = gql`
  mutation AdminDeleteUser($userId: String!) { adminDeleteUser(userId: $userId) }
`

type Tab = 'groups' | 'users'

export default function AdminScreen() {
  const { colors } = useTheme()
  const user = useAuthStore(state => state.user)
  const [tab, setTab] = useState<Tab>('groups')

  const { data: groupsData, refetch: refetchGroups } = useQuery(ADMIN_GROUPS, { variables: { page: 1, limit: 50 } })
  const { data: usersData, refetch: refetchUsers } = useQuery(ADMIN_USERS, { variables: { page: 1, limit: 50 } })
  const [deleteGroupMutation] = useMutation(ADMIN_DELETE_GROUP, { refetchQueries: [{ query: ADMIN_GROUPS, variables: { page: 1, limit: 50 } }] })
  const [deleteUserMutation] = useMutation(ADMIN_DELETE_USER, { refetchQueries: [{ query: ADMIN_USERS, variables: { page: 1, limit: 50 } }] })

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Acceso restringido a administradores</Text>
      </View>
    )
  }

  const handleDeleteGroup = (id: string, name: string) => {
    Alert.alert('Eliminar grupo', `¿Eliminar "${name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroupMutation({ variables: { groupId: id } })
            showSuccessToast(`Grupo "${name}" eliminado correctamente`)
          } catch (e: any) {
            const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error al eliminar el grupo'
            showErrorToast(msg)
          }
        },
      },
    ])
  }

  const handleDeleteUser = (id: string, name: string) => {
    Alert.alert('Eliminar usuario', `¿Eliminar a "${name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserMutation({ variables: { userId: id } })
            showSuccessToast(`Usuario "${name}" eliminado correctamente`)
          } catch (e: any) {
            const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error al eliminar el usuario'
            showErrorToast(msg)
          }
        },
      },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Admin Panel" showBack={false} />

      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
          <TouchableOpacity onPress={() => setTab('groups')}
            style={{ flex: 1, backgroundColor: tab === 'groups' ? colors.primary : colors.surface, borderRadius: 24, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: tab === 'groups' ? colors.text : colors.textSecondary, fontWeight: '600' }}>Grupos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('users')}
            style={{ flex: 1, backgroundColor: tab === 'users' ? colors.primary : colors.surface, borderRadius: 24, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: tab === 'users' ? colors.text : colors.textSecondary, fontWeight: '600' }}>Usuarios</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'groups' && (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          data={groupsData?.adminGroups?.items || []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.memberCount} miembros</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteGroup(item.id, item.name)} style={{ backgroundColor: colors.error + '20', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: colors.error, fontSize: 13 }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {tab === 'users' && (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          data={usersData?.adminUsers?.items || []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.email} · {item.role}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteUser(item.id, item.name)} style={{ backgroundColor: colors.error + '20', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: colors.error, fontSize: 13 }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}
