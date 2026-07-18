import { useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert, KeyboardAvoidingView, Platform, Image, Pressable } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from '@apollo/client'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../../src/stores/authStore'
import { EXERCISES_QUERY, GROUP_QUERY, CREATE_EXERCISE_MUTATION, INVITE_TO_GROUP_MUTATION, UPDATE_GROUP_MUTATION, DELETE_GROUP_MUTATION } from '../../../../src/lib/graphql'
import { uploadGroupAvatar } from '../../../../src/lib/api'
import ScreenHeader from '../../../../src/components/ui/ScreenHeader'

const UNITS = ['KG', 'REPS', 'MIN', 'SEC', 'M'] as const
const UNIT_LABELS: Record<string, string> = { KG: 'kg', REPS: 'reps', MIN: 'min', SEC: 'seg', M: 'm' }

export default function GroupDashboardScreen() {
  const { colors } = useTheme()
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const currentUser = useAuthStore(state => state.user)

  // --- Queries ---
  const { data: exercisesData, loading, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { groupId },
  })
  const { data: groupData } = useQuery(GROUP_QUERY, { variables: { id: groupId } })

  // --- Mutations ---
  const [createExercise, { loading: creating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: EXERCISES_QUERY, variables: { groupId } }],
  })
  const [inviteToGroup, { loading: inviting }] = useMutation(INVITE_TO_GROUP_MUTATION)
  const [updateGroup, { loading: updating }] = useMutation(UPDATE_GROUP_MUTATION, {
    refetchQueries: [{ query: GROUP_QUERY, variables: { id: groupId } }],
  })
  const [deleteGroupMutation, { loading: deleting }] = useMutation(DELETE_GROUP_MUTATION)

  // --- State ---
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [inviteIdentifier, setInviteIdentifier] = useState('')
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseUnit, setExerciseUnit] = useState<string>('KG')

  const exercises: any[] = exercisesData?.exercises || []
  const group = groupData?.group
  const isOwner = currentUser?.id && group?.owner?.id === currentUser.id

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
      Alert.alert('Guardado', 'El nombre del grupo se actualizó correctamente.')
    } catch (e: any) {
      Alert.alert('Error', e?.graphQLErrors?.[0]?.message || e.message)
    }
  }

  const handleChangeImage = async () => {
    setShowMenu(false)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })
      if (!result.canceled && result.assets[0]) {
        const avatarUrl = await uploadGroupAvatar(result.assets[0].uri)
        await updateGroup({ variables: { id: groupId, input: { avatarUrl } } })
        Alert.alert('Imagen actualizada', 'La imagen del grupo se actualizó correctamente.')
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Error al actualizar la imagen')
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
              router.replace('/(app)/groups')
            } catch (e: any) {
              Alert.alert('Error', e?.graphQLErrors?.[0]?.message || e.message)
            }
          },
        },
      ],
    )
  }

  // --- Invite to group ---
  const handleInvite = async () => {
    if (!inviteIdentifier.trim()) return
    try {
      const result = await inviteToGroup({
        variables: { groupId, inviteeIdentifier: inviteIdentifier.trim() },
      })
      if (result.errors?.[0]) {
        Alert.alert('Error', result.errors[0].message)
        return
      }
      Alert.alert(
        'Invitación enviada',
        'Si el usuario existe, recibirá la invitación.',
      )
      setShowInviteModal(false)
      setInviteIdentifier('')
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error de red'
      Alert.alert('Error', msg)
    }
  }

  // --- Create exercise ---
  const handleCreateExercise = async () => {
    if (!exerciseName.trim()) return
    try {
      const result = await createExercise({
        variables: { input: { groupId, name: exerciseName.trim(), unit: exerciseUnit } },
      })
      if (result.errors?.[0]) {
        Alert.alert('Error', result.errors[0].message)
        return
      }
      setShowCreateModal(false)
      setExerciseName('')
      setExerciseUnit('KG')
    } catch (e: any) {
      const msg = e?.graphQLErrors?.[0]?.message || e?.message || 'Error de red'
      Alert.alert('Error', msg)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={group?.name || 'Ejercicios'}
        rightAction={isOwner ? (
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : undefined}
      />

      {/* Dropdown overlay */}
      {showMenu && (
        <>
          <Pressable
            onPress={() => setShowMenu(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
          />
          <View style={{
            position: 'absolute',
            top: 100,
            right: 16,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            zIndex: 999,
            minWidth: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <TouchableOpacity
              onPress={handleEditGroup}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 14 }}>Editar nombre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleChangeImage}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Ionicons name="image-outline" size={18} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: 14 }}>Cambiar imagen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteGroup}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={{ color: colors.error, fontSize: 14 }}>Eliminar grupo</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <FlatList
        data={exercises}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            {/* Group avatar */}
            <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
              {group?.avatarUrl ? (
                <Image
                  source={{ uri: group.avatarUrl }}
                  style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
                  justifyContent: 'center', alignItems: 'center', marginBottom: 8,
                }}>
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

            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>
                  + Crear ejercicio
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>
                No hay ejercicios en este grupo aún
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                Creá el primer ejercicio para empezar a competir
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: ex }: any) => (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/groups/${groupId}/exercises/${ex.id}`)}
            activeOpacity={0.7}
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Exercise image */}
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
              overflow: 'hidden',
            }}>
              {ex.imageUrl ? (
                <Image
                  source={{ uri: ex.imageUrl }}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: 22, color: colors.primary, fontWeight: '700' }}>
                  {ex.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            {/* Name + unit */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {UNIT_LABELS[ex.unit] || ex.unit}
              </Text>
            </View>

            {/* Arrow */}
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        )}
      />

      {/* Floating action buttons */}
      <View style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        flexDirection: 'row',
        gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => router.push(`/(app)/groups/${groupId}/members`)}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 28,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="people-outline" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
            Integrantes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowInviteModal(true)}
          style={{
            flex: 1,
            backgroundColor: colors.primary,
            borderRadius: 28,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '300' }}>+</Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
            Invitar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Invite modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                Invitar al grupo
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
                Ingresá el correo, teléfono o nombre completo de la persona
              </Text>

              <TextInput
                value={inviteIdentifier}
                onChangeText={setInviteIdentifier}
                placeholder="Correo, teléfono o nombre"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 24,
                  borderWidth: 1, borderColor: colors.border, fontSize: 16,
                }}
              />

              <TouchableOpacity
                onPress={handleInvite}
                disabled={!inviteIdentifier.trim() || inviting}
                style={{
                  backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
                  opacity: (!inviteIdentifier.trim() || inviting) ? 0.6 : 1,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {inviting ? 'Enviando…' : 'Enviar invitación'}
                </Text>
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
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
                Crear ejercicio
              </Text>

              <TextInput
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="Nombre del ejercicio (ej: Press banca)"
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16,
                  borderWidth: 1, borderColor: colors.border, fontSize: 16,
                }}
              />

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
                    <Text style={{
                      color: exerciseUnit === unit ? colors.text : colors.textSecondary,
                      fontWeight: exerciseUnit === unit ? '600' : '400',
                    }}>
                      {UNIT_LABELS[unit]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleCreateExercise}
                disabled={!exerciseName.trim() || creating}
                style={{
                  backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
                  opacity: (!exerciseName.trim() || creating) ? 0.6 : 1,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {creating ? 'Creando…' : 'Crear ejercicio'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setShowCreateModal(false); setExerciseName(''); setExerciseUnit('KG') }} style={{ padding: 12, alignItems: 'center' }}>
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
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
              Editar grupo
            </Text>
            <TextInput
              placeholder="Nombre del grupo"
              placeholderTextColor={colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
              style={{
                backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 16, marginBottom: 16,
                borderWidth: 1, borderColor: colors.border, fontSize: 16,
              }}
            />
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={updating || !editName.trim()}
              style={{
                backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 8,
                opacity: (updating || !editName.trim()) ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {updating ? 'Guardando…' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
