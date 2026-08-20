import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Image } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useLazyQuery } from '@apollo/client'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../../src/stores/authStore'
import { GROUP_QUERY, INVITE_TO_GROUP_MUTATION, REMOVE_MEMBER_MUTATION, SEARCH_USERS_QUERY } from '../../../../src/lib/graphql'
import { getImageUrl } from '../../../../src/lib/api'
import { showSuccessToast, showErrorToast } from '../../../../src/lib/toast'
import ScreenHeader from '../../../../src/components/ui/ScreenHeader'
import ImageWithFallback from '../../../../src/components/ui/ImageWithFallback'

export default function MembersScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const currentUser = useAuthStore(state => state.user)
  const { data, loading, refetch } = useQuery(GROUP_QUERY, { variables: { id: groupId } })
  const [inviteMutation, { loading: inviting }] = useMutation(INVITE_TO_GROUP_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })
  const [removeMemberMutation, { loading: removing }] = useMutation(REMOVE_MEMBER_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })

  const [showInvite, setShowInvite] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const [searchUsers] = useLazyQuery(SEARCH_USERS_QUERY)

  const group = data?.group
  const isOwner = currentUser?.id && group?.owner?.id === currentUser.id

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Eliminar miembro',
      `¿Estás seguro de que querés eliminar a "${memberName}" del grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberMutation({ variables: { groupId, userId: memberId } })
              showSuccessToast(`${memberName} fue eliminado del grupo`)
            } catch (e: any) {
              const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error al eliminar miembro'
              showErrorToast(msg)
            }
          },
        },
      ],
    )
  }

  const handleInvite = async () => {
    const identifier = selectedUser?.email || query.trim()
    if (!identifier) return
    try {
      const result = await inviteMutation({ variables: { groupId, inviteeIdentifier: identifier } })
      if (result.errors?.[0]) {
        showErrorToast(result.errors[0].message)
        return
      }
      showSuccessToast(selectedUser
        ? `Invitación enviada a ${selectedUser.name}`
        : `Invitación enviada a ${identifier}`,
      )
      setShowInvite(false)
      setQuery('')
      setSearchResults([])
      setSelectedUser(null)
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error al invitar'
      showErrorToast(msg)
    }
  }

  const handleSearch = (text: string) => {
    setQuery(text)
    setSelectedUser(null)
    if (searchTimeout) clearTimeout(searchTimeout)
    if (text.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const { data } = await searchUsers({ variables: { query: text.trim() } })
        setSearchResults(data?.searchUsers || [])
      } catch {
        setSearchResults([])
      }
    }, 300)
    setSearchTimeout(timeout)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Miembros"
        fallbackHref={`/(app)/groups/${groupId}`}
        rightAction={
          <TouchableOpacity onPress={() => setShowInvite(true)} style={{ backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Invitar</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={group?.members || []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }: any) => (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8,
            flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
          }}>
            <ImageWithFallback
              source={{ uri: getImageUrl(item.user.avatarUrl) }}
              style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
              fallback={
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{item.user.name.charAt(0)}</Text>
                </View>
              }
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '500' }}>{item.user.name}</Text>
            </View>
            {item.role === 'OWNER' ? (
              <View style={{ backgroundColor: colors.warning + '40', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 }}>
                <Text style={{ color: colors.text, fontSize: 12 }}>Dueño</Text>
              </View>
            ) : isOwner ? (
              <TouchableOpacity
                onPress={() => handleRemoveMember(item.user.id, item.user.name)}
                disabled={removing}
                style={{ backgroundColor: colors.error + '20', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text style={{ color: colors.error, fontSize: 12, fontWeight: '500' }}>Eliminar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />

      <Modal visible={showInvite} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Invitar miembro</Text>
              <TouchableOpacity onPress={() => { setShowInvite(false); setQuery(''); setSearchResults([]); setSelectedUser(null) }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Instruction */}
            <View style={{
              backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 16,
              borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.primary,
            }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Buscá por <Text style={{ fontWeight: '600', color: colors.text }}>nombre, correo o teléfono</Text>.
                Si está registrada en la app, recibirá una invitación.
              </Text>
            </View>

            {selectedUser ? (
              <View style={{
                backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 16,
                borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <ImageWithFallback
                  source={{ uri: getImageUrl(selectedUser.avatarUrl) }}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                  fallback={
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontWeight: 'bold', color: colors.text }}>{selectedUser.name.charAt(0)}</Text>
                    </View>
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{selectedUser.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{selectedUser.email}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedUser(null); setQuery(''); setSearchResults([]) }}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                placeholder="Nombre, correo o teléfono…"
                placeholderTextColor={colors.textSecondary}
                value={query} onChangeText={handleSearch}
                autoCapitalize="none" autoCorrect={false}
                style={{
                  backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 8,
                  borderWidth: 1, borderColor: colors.border, fontSize: 16,
                }}
              />
            )}

            {/* Search results dropdown */}
            {searchResults.length > 0 && !selectedUser && (
              <View style={{
                backgroundColor: colors.background, borderRadius: 12, marginBottom: 16, maxHeight: 200,
                borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
              }}>
                  {searchResults.map((u: any) => (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => setSelectedUser(u)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                    >
                      <ImageWithFallback
                        source={{ uri: getImageUrl(u.avatarUrl) }}
                        style={{ width: 36, height: 36, borderRadius: 18 }}
                        fallback={
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontWeight: 'bold', color: colors.text }}>{u.name.charAt(0)}</Text>
                          </View>
                        }
                      />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '500' }}>{u.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{u.email}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={handleInvite}
              disabled={(!query.trim() && !selectedUser) || inviting}
              style={{
                backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
                opacity: ((!query.trim() && !selectedUser) || inviting) ? 0.6 : 1,
              }}
            >
              {inviting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {selectedUser ? `Invitar a ${selectedUser.name}` : 'Enviar invitación'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setShowInvite(false); setQuery(''); setSearchResults([]); setSelectedUser(null) }} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
