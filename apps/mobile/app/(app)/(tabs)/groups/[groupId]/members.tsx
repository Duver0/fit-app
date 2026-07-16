import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useQuery, useMutation, useLazyQuery } from '@apollo/client'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../../../src/theme/ThemeProvider'
import { GROUP_QUERY, INVITE_TO_GROUP_MUTATION, SEARCH_USERS_QUERY } from '../../../../../src/lib/graphql'

export default function MembersScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const { data, loading, refetch } = useQuery(GROUP_QUERY, { variables: { id: groupId } })
  const [inviteMutation, { loading: inviting }] = useMutation(INVITE_TO_GROUP_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })
  const [searchUsers, { data: searchData, loading: searching }] = useLazyQuery(SEARCH_USERS_QUERY)

  const [showInvite, setShowInvite] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const group = data?.group
  const results = searchData?.searchUsers || []

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return
    const timer = setTimeout(() => {
      searchUsers({ variables: { query: searchQuery.trim(), excludeGroupId: groupId } })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, groupId, searchUsers])

  const handleInvite = async (email: string) => {
    try {
      const result = await inviteMutation({ variables: { groupId, inviteeEmail: email } })
      if (result.errors?.[0]) {
        Alert.alert('Error', result.errors[0].message)
        return
      }
      Alert.alert('Invitación enviada', `Se invitó a ${email} correctamente.`)
      setShowInvite(false)
      setSearchQuery('')
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
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 350 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Invitar miembro</Text>
              <TouchableOpacity onPress={() => { setShowInvite(false); setSearchQuery('') }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Instruction */}
            <View style={{
              backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 16,
              borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.primary,
            }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Buscá por <Text style={{ fontWeight: '600', color: colors.text }}>nombre</Text> o{' '}
                <Text style={{ fontWeight: '600', color: colors.text }}>correo electrónico</Text> de la persona.
                Si existe, seleccionala para enviarle la invitación. Si no aparece, esa persona aún no está registrada en la app.
              </Text>
            </View>

            {/* Search input */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
              borderRadius: 12, paddingHorizontal: 16, marginBottom: 16,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Buscar por nombre o email..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery} onChangeText={setSearchQuery}
                autoCapitalize="none"
                style={{ flex: 1, color: colors.text, paddingVertical: 14, fontSize: 16 }}
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Results */}
            {searchQuery.trim().length >= 2 && (
              <>
                {results.length === 0 && !searching ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Ionicons name="search-outline" size={32} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                      No se encontraron usuarios con ese nombre o email{'\n'}La persona debe estar registrada en la app
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={results}
                    keyExtractor={(item: any) => item.id}
                    style={{ maxHeight: 200 }}
                    renderItem={({ item }: any) => (
                      <TouchableOpacity
                        onPress={() => handleInvite(item.email)}
                        disabled={inviting}
                        style={{
                          flexDirection: 'row', alignItems: 'center', padding: 14,
                          backgroundColor: colors.background, borderRadius: 12, marginBottom: 6,
                          borderWidth: 1, borderColor: colors.border,
                          opacity: inviting ? 0.6 : 1,
                        }}
                      >
                        <View style={{
                          width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
                          justifyContent: 'center', alignItems: 'center', marginRight: 12,
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: '500' }}>{item.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.email}</Text>
                        </View>
                        <Ionicons name="send" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  />
                )}
              </>
            )}

            {searchQuery.trim().length < 2 && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Escribí al menos 2 caracteres para buscar
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}
