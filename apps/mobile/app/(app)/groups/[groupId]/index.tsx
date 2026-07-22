import { useState, useMemo } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform, Image, Pressable, Alert, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useLazyQuery } from '@apollo/client'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../../src/stores/authStore'
import { EXERCISES_QUERY, GROUP_QUERY, CREATE_EXERCISE_MUTATION, INVITE_TO_GROUP_MUTATION, UPDATE_GROUP_MUTATION, DELETE_GROUP_MUTATION, SEARCH_USERS_QUERY, CREATE_EXERCISE_CATEGORY_MUTATION, DELETE_EXERCISE_CATEGORY_MUTATION } from '../../../../src/lib/graphql'
import { getImageUrl } from '../../../../src/lib/api'
import { showSuccessToast, showErrorToast } from '../../../../src/lib/toast'
import ScreenHeader from '../../../../src/components/ui/ScreenHeader'
import AvatarPickerModal from '../../../../src/components/ui/AvatarPickerModal'

const UNITS = ['KG', 'REPS', 'REPS_AND_WEIGHT', 'MIN', 'SEC', 'M'] as const
const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', REPS_AND_WEIGHT: 'reps + peso', MIN: 'min', SEC: 'seg', M: 'm' }

const CATEGORY_CARD_GAP = 12

export default function GroupDashboardScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const currentUser = useAuthStore(state => state.user)
  const { width: screenWidth } = useWindowDimensions()

  // --- Queries ---
  const { data: exercisesData, loading, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { groupId },
  })
  const { data: groupData, loading: groupLoading } = useQuery(GROUP_QUERY, { variables: { id: groupId } })

  // --- Mutations ---
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: EXERCISES_QUERY, variables: { groupId } }, { query: GROUP_QUERY, variables: { id: groupId } }],
  })
  const [inviteToGroup, { loading: inviting }] = useMutation(INVITE_TO_GROUP_MUTATION)
  const [updateGroup, { loading: updating }] = useMutation(UPDATE_GROUP_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })
  const [deleteGroupMutation, { loading: deleting }] = useMutation(DELETE_GROUP_MUTATION)
  const [createCategory] = useMutation(CREATE_EXERCISE_CATEGORY_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })
  const [deleteCategory] = useMutation(DELETE_EXERCISE_CATEGORY_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }, { query: EXERCISES_QUERY, variables: { groupId } }],
  })

  // --- State ---
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showCatCreateModal, setShowCatCreateModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [inviteIdentifier, setInviteIdentifier] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [catName, setCatName] = useState('')
  const [showInlineCatCreate, setShowInlineCatCreate] = useState(false)

  const [searchUsers] = useLazyQuery(SEARCH_USERS_QUERY)
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState<string>('KG')
  const [exerciseCategoryId, setExerciseCategoryId] = useState<string | null>(null)

  const exercises: any[] = exercisesData?.exercises || []
  const group = groupData?.group
  const isOwner = currentUser?.id && group?.owner?.id === currentUser.id
  const categories: any[] = group?.categories || []

  const uncategorizedExercises = useMemo(
    () => exercises.filter((e: any) => !e.categoryId),
    [exercises],
  )

  // Card dimensions: 2 columns with gap
  const cardSize = (screenWidth - 16 * 2 - CATEGORY_CARD_GAP) / 2

  // Sub-icon size within the 2x2 grid inside a category card
  const subIconSize = (cardSize - 24 - 8) / 2

  // --- Menu handlers ---
  const handleEditGroup = () => {
    setShowMenu(false)
    setEditName(group?.name || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) return
    try {
      await updateGroup({ variables: { id: groupId, input: { name: editName.trim() } } })
      setShowEditModal(false)
      showSuccessToast('Nombre del grupo actualizado')
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    }
  }

  const handleChangeImage = () => {
    setShowMenu(false)
    setAvatarPickerVisible(true)
  }

  const handleAvatarSelected = async (url: string) => {
    setAvatarPickerVisible(false)
    try {
      await updateGroup({ variables: { id: groupId, input: { avatarUrl: url } } })
      showSuccessToast('Imagen del grupo actualizada')
    } catch (e: any) {
      showErrorToast(e?.message || 'Error al actualizar la imagen')
    }
  }

  const handleDeleteGroup = () => {
    setShowMenu(false)
    Alert.alert(
      'Eliminar grupo',
      '¿Estás seguro de que querés eliminar este grupo? Esta acción no se puede deshacer. Se eliminarán todos los ejercicios y marcas asociadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroupMutation({ variables: { id: groupId } })
              showSuccessToast('Grupo eliminado')
              router.replace('/(app)/groups')
            } catch (e: any) {
              showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
            }
          },
        },
      ],
    )
  }

  // --- Invite to group ---
  const handleInvite = async () => {
    const identifier = selectedUser?.email || inviteIdentifier.trim()
    if (!identifier) return
    try {
      const result = await inviteToGroup({
        variables: { groupId, inviteeIdentifier: identifier },
      })
      if (result.errors?.[0]) {
        showErrorToast(result.errors[0].message)
        return
      }
      showSuccessToast(selectedUser
        ? `Invitación enviada a ${selectedUser.name}`
        : 'Invitación enviada',
      )
      setShowInviteModal(false)
      setInviteIdentifier('')
      setSearchResults([])
      setSelectedUser(null)
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error de red'
      showErrorToast(msg)
    }
  }

  const handleSearch = (text: string) => {
    setInviteIdentifier(text)
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

  // --- Create exercise ---
  const handleCreateExercise = async () => {
    if (!exerciseName.trim()) return
    try {
      const vars: any = { input: { groupId, name: exerciseName.trim(), unit: exerciseUnit } }
      if (exerciseCategoryId) vars.input.categoryId = exerciseCategoryId
      const result = await createExercise({ variables: vars })
      if (result.errors?.[0]) {
        showErrorToast(result.errors[0].message)
        return
      }
      setShowCreateModal(false)
      setExerciseName('')
      setExerciseUnit('KG')
      setExerciseCategoryId(null)
      showSuccessToast('Ejercicio creado')
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error de red'
      showErrorToast(msg)
    }
  }

  // --- Category management ---
  const handleCreateCategory = async () => {
    if (!catName.trim()) return
    try {
      await createCategory({ variables: { input: { groupId, name: catName.trim() } } })
      setShowCatCreateModal(false)
      setCatName('')
      showSuccessToast('Categoría creada')
    } catch (e: any) {
      showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
    }
  }

  const handleDeleteCategory = (catId: string, catName: string) => {
    Alert.alert(
      `Eliminar categoría "${catName}"`,
      'Los ejercicios en esta categoría pasarán a estar sin categoría.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory({ variables: { id: catId } })
              showSuccessToast('Categoría eliminada')
            } catch (e: any) {
              showErrorToast(e?.graphQLErrors?.[0]?.message || e.message)
            }
          },
        },
      ],
    )
  }

  const renderSubIcon = (ex: any, size: number) => {
    const initials = ex.name.charAt(0).toUpperCase()
    return (
      <View
        key={ex.id}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {getImageUrl(ex.imageUrl) ? (
          <Image source={{ uri: getImageUrl(ex.imageUrl) }} style={{ width: size, height: size, borderRadius: 6 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: size * 0.45, fontWeight: '700', color: colors.primary }}>{initials}</Text>
        )}
      </View>
    )
  }

  const renderCategoryCard = (cat: any, index: number) => {
    const catExercises = exercises.filter((e: any) => e.categoryId === cat.id)
    const previewExercises = catExercises.slice(0, 4)
    const gridSize = subIconSize * 2 + 4 // 2 columns + gap

    return (
      <TouchableOpacity
        key={cat.id}
        onPress={() => router.push(`/(app)/groups/${groupId}/categories/${cat.id}`)}
        activeOpacity={0.7}
        style={{
          width: cardSize,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.border,
          padding: 14,
        }}
      >
        {/* 2x2 miniature grid centered */}
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap', gap: 4,
          width: gridSize, height: gridSize,
          alignSelf: 'center',
        }}>
          {previewExercises.map(ex => renderSubIcon(ex, subIconSize))}
          {/* Fill remaining slots if less than 4 exercises */}
          {Array.from({ length: Math.max(0, 4 - previewExercises.length) }).map((_, i) => (
            <View
              key={`empty-${i}`}
              style={{
                width: subIconSize,
                height: subIconSize,
                borderRadius: 6,
                backgroundColor: colors.background,
                opacity: 0.4,
              }}
            />
          ))}
        </View>

        {/* Category name centered below grid */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.text,
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            {cat.name}
          </Text>
          <View style={{
            backgroundColor: colors.primary + '20',
            borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
            marginLeft: 6,
          }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
              {catExercises.length}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderExerciseItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/groups/${groupId}/exercises/${item.id}`)}
      activeOpacity={0.7}
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 12, backgroundColor: colors.background,
        justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden',
      }}>
        {getImageUrl(item.imageUrl) ? (
          <Image source={{ uri: getImageUrl(item.imageUrl) }} style={{ width: 48, height: 48, borderRadius: 12 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '700' }}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
          {UNIT_LABELS[item.unit] || item.unit}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={group?.name || 'Ejercicios'}
        rightAction={
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Dropdown menu */}
      <Modal visible={showMenu} transparent animationType="none">
        <Pressable style={{ flex: 1 }} onPress={() => setShowMenu(false)}>
          <View style={{ flex: 1 }}>
            <View style={{
              position: 'absolute', top: 100, right: 16, backgroundColor: colors.surface,
              borderRadius: 12, borderWidth: 1, borderColor: colors.border, minWidth: 200,
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
            }}>
              {isOwner && (
                <TouchableOpacity onPress={handleEditGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Ionicons name="pencil-outline" size={18} color={colors.text} />
                  <Text style={{ color: colors.text, fontSize: 14 }}>Editar nombre</Text>
                </TouchableOpacity>
              )}
              {isOwner && (
                <TouchableOpacity onPress={handleChangeImage} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Ionicons name="image-outline" size={18} color={colors.text} />
                  <Text style={{ color: colors.text, fontSize: 14 }}>Cambiar imagen</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setShowMenu(false); setShowCatModal(true) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Ionicons name="folder-outline" size={18} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 14 }}>Categorías</Text>
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity onPress={handleDeleteGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 14 }}>Eliminar grupo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>

      <FlatList
        data={uncategorizedExercises}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            {/* Group header */}
            <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
              {getImageUrl(group?.avatarUrl) ? (
                <Image source={{ uri: getImageUrl(group?.avatarUrl) }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>
                    {group?.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {group?.description ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 8, paddingHorizontal: 24 }}>
                  {group.description}
                </Text>
              ) : null}
            </View>

            {/* Create exercise button */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={{
                  backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1,
                  borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>
                  + Crear ejercicio
                </Text>
              </TouchableOpacity>
            </View>

            {/* Categories grid */}
            {categories.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CATEGORY_CARD_GAP }}>
                  {categories.map((cat: any, i: number) => renderCategoryCard(cat, i))}
                </View>
              </View>
            )}

            {/* Section label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
              <Ionicons name="folder-open-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
                Sin categoría
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {uncategorizedExercises.length}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12, marginBottom: 4 }}>
                {exercises.length === 0
                  ? 'No hay ejercicios en este grupo aún'
                  : 'No hay ejercicios sin categoría'}
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                {exercises.length === 0
                  ? 'Creá el primer ejercicio para empezar a competir'
                  : 'Arrastrá ejercicios a una categoría o creá nuevos con categoría'}
              </Text>
            </View>
          </View>
        }
        renderItem={renderExerciseItem}
      />

      {/* Floating action buttons */}
      <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.push(`/(app)/groups/${groupId}/members`)}
          style={{
            flex: 1, backgroundColor: colors.surface, borderRadius: 28, paddingVertical: 16,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1, borderColor: colors.border,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
          }}
        >
          <Ionicons name="people-outline" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Integrantes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowInviteModal(true)}
          style={{
            flex: 1, backgroundColor: colors.primary, borderRadius: 28, paddingVertical: 16,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '300' }}>+</Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Invitar</Text>
        </TouchableOpacity>
      </View>

      {/* Invite modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Invitar al grupo</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
                Ingresá el correo, teléfono o nombre completo de la persona
              </Text>

              {selectedUser ? (
                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', color: colors.text }}>{selectedUser.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{selectedUser.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{selectedUser.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedUser(null); setInviteIdentifier(''); setSearchResults([]) }}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  value={inviteIdentifier}
                  onChangeText={handleSearch}
                  placeholder="Correo, teléfono o nombre"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border, fontSize: 16 }}
                />
              )}

              {searchResults.length > 0 && !selectedUser && (
                <View style={{ backgroundColor: colors.background, borderRadius: 12, marginBottom: 16, maxHeight: 200, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                  {searchResults.map((u: any) => (
                    <TouchableOpacity key={u.id} onPress={() => setSelectedUser(u)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontWeight: 'bold', color: colors.text }}>{u.name.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '500' }}>{u.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{u.email}</Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity onPress={handleInvite} disabled={(!inviteIdentifier.trim() && !selectedUser) || inviting} style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: ((!inviteIdentifier.trim() && !selectedUser) || inviting) ? 0.6 : 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{inviting ? 'Enviando…' : 'Enviar invitación'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowInviteModal(false); setInviteIdentifier('') }} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create exercise modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Crear ejercicio</Text>

              <TextInput
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="Nombre del ejercicio (ej: Press banca)"
                placeholderTextColor={colors.textSecondary}
                style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, fontSize: 16 }}
              />

              {/* Category selector */}
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Categoría (opcional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setExerciseCategoryId(null)}
                  style={{
                    backgroundColor: !exerciseCategoryId ? colors.primary : colors.background,
                    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
                    borderWidth: 1, borderColor: !exerciseCategoryId ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: !exerciseCategoryId ? colors.text : colors.textSecondary, fontWeight: !exerciseCategoryId ? '600' : '400', fontSize: 13 }}>Sin categoría</Text>
                </TouchableOpacity>
                {categories.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setExerciseCategoryId(cat.id)}
                    style={{
                      backgroundColor: exerciseCategoryId === cat.id ? colors.primary : colors.background,
                      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
                      borderWidth: 1, borderColor: exerciseCategoryId === cat.id ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: exerciseCategoryId === cat.id ? colors.text : colors.textSecondary, fontWeight: exerciseCategoryId === cat.id ? '600' : '400', fontSize: 13 }}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
                {!showInlineCatCreate && (
                  <TouchableOpacity
                    onPress={() => setShowInlineCatCreate(true)}
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                      borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Nueva</Text>
                  </TouchableOpacity>
                )}
              </View>
              {showInlineCatCreate && (
                <View style={{ marginBottom: 16, backgroundColor: colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.primary }}>
                  <TextInput
                    value={catName}
                    onChangeText={setCatName}
                    placeholder="Nombre de la categoría"
                    placeholderTextColor={colors.textSecondary}
                    style={{ backgroundColor: colors.surface, color: colors.text, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, fontSize: 15 }}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={async () => {
                        if (!catName.trim()) return
                        try {
                          const res = await createCategory({ variables: { input: { groupId, name: catName.trim() } } })
                          const newCatId = res.data?.createExerciseCategory?.id
                          if (newCatId) setExerciseCategoryId(newCatId)
                          setCatName('')
                          setShowInlineCatCreate(false)
                        } catch (e: any) { showErrorToast(e?.graphQLErrors?.[0]?.message || e.message) }
                      }}
                      disabled={!catName.trim()}
                      style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center', opacity: !catName.trim() ? 0.6 : 1 }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Crear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowInlineCatCreate(false); setCatName('') }} style={{ padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Unidad de medida</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {UNITS.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    onPress={() => setExerciseUnit(unit)}
                    style={{
                      backgroundColor: exerciseUnit === unit ? colors.primary : colors.background,
                      borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
                      borderWidth: 1, borderColor: exerciseUnit === unit ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: exerciseUnit === unit ? colors.text : colors.textSecondary, fontWeight: exerciseUnit === unit ? '600' : '400' }}>
                      {UNIT_LABELS[unit]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={handleCreateExercise} disabled={!exerciseName.trim() || creating} style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: (!exerciseName.trim() || creating) ? 0.6 : 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{creating ? 'Creando…' : 'Crear ejercicio'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); setExerciseName(''); setExerciseUnit('KG'); setExerciseCategoryId(null); setShowInlineCatCreate(false); setCatName('') }} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Group Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Editar grupo</Text>
            <TextInput
              placeholder="Nombre del grupo"
              placeholderTextColor={colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
              style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, fontSize: 16 }}
            />
            <TouchableOpacity onPress={handleSaveEdit} disabled={updating || !editName.trim()} style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: (updating || !editName.trim()) ? 0.6 : 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{updating ? 'Guardando…' : 'Guardar cambios'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manage categories modal */}
      <Modal visible={showCatModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Categorías</Text>
                <TouchableOpacity onPress={() => { setShowCatModal(false); setTimeout(() => setShowCatCreateModal(true), 300) }}>
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {categories.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>No hay categorías aún</Text>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>Creá categorías como "Pecho", "Espalda", "Piernas" para organizar los ejercicios</Text>
                </View>
              ) : (
                categories.map((cat: any) => {
                  const catExCount = exercises.filter((e: any) => e.categoryId === cat.id).length
                  return (
                    <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Ionicons name="folder" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                      <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{cat.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginRight: 12 }}>{catExCount} ej.</Text>
                      {isOwner && (
                        <TouchableOpacity onPress={() => handleDeleteCategory(cat.id, cat.name)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                })
              )}

              <TouchableOpacity onPress={() => setShowCatModal(false)} style={{ padding: 12, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: colors.textSecondary }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create category modal */}
      <Modal visible={showCatCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Crear categoría</Text>
              <TextInput
                value={catName}
                onChangeText={setCatName}
                placeholder="Ej: Pecho, Espalda, Piernas"
                placeholderTextColor={colors.textSecondary}
                style={{ backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, fontSize: 16 }}
              />
              <TouchableOpacity onPress={handleCreateCategory} disabled={!catName.trim()} style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8, opacity: !catName.trim() ? 0.6 : 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Crear categoría</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCatCreateModal(false); setCatName('') }} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AvatarPickerModal
        visible={avatarPickerVisible}
        context="group"
        onSelect={handleAvatarSelected}
        onCancel={() => setAvatarPickerVisible(false)}
      />
    </View>
  )
}
