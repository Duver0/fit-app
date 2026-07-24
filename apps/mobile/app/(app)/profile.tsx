import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { useMutation } from '@apollo/client'
import { useTheme } from '../../src/theme/ThemeProvider'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/stores/themeStore'
import { UPDATE_PROFILE_MUTATION, TOGGLE_ROUTINE_MUTATION, TOGGLE_SINGLE_GROUP_AUTO_ENTER_MUTATION } from '../../src/lib/graphql'
import { getImageUrl } from '../../src/lib/api'
import { showErrorToast, showSuccessToast } from '../../src/lib/toast'
import ScreenHeader from '../../src/components/ui/ScreenHeader'
import AvatarPickerModal from '../../src/components/ui/AvatarPickerModal'
import ImageWithFallback from '../../src/components/ui/ImageWithFallback'

export default function ProfileScreen() {
  const { colors } = useTheme()
  const user = useAuthStore(state => state.user)
  const updateUser = useAuthStore(state => state.updateUser)
  const handleLogout = useAuthStore(state => state.clearAuth)
  const { isDark, toggle } = useThemeStore()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false)

  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION)
  const [toggleRoutine] = useMutation(TOGGLE_ROUTINE_MUTATION)
  const [toggleSingleGroup] = useMutation(TOGGLE_SINGLE_GROUP_AUTO_ENTER_MUTATION)

  const handleAvatarSelected = (url: string) => {
    setAvatarUrl(url)
    setAvatarPickerVisible(false)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      showErrorToast('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      const variables: Record<string, string> = { name: name.trim() }
      if (phone.trim()) variables.phone = phone.trim()
      if (avatarUrl) variables.avatarUrl = avatarUrl

      const { data } = await updateProfile({ variables })

      if (data?.updateProfile) {
        updateUser(data.updateProfile)
      }

      setIsEditing(false)
      showSuccessToast('Perfil actualizado correctamente')
    } catch (e: any) {
      showErrorToast(e.message || 'Ocurrió un error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setName(user?.name ?? '')
    setPhone(user?.phone ?? '')
    setAvatarUrl(null)
    setIsEditing(false)
  }

  const handleToggleRoutine = async () => {
    const newValue = !user?.routineEnabled
    try {
      const { data } = await toggleRoutine({ variables: { enabled: newValue } })
      if (data?.toggleRoutine) {
        updateUser(data.toggleRoutine)
      }
      showSuccessToast(newValue ? 'Rutina activada' : 'Rutina desactivada')
    } catch (e: any) {
      showErrorToast(e.message || 'Error al cambiar la preferencia')
    }
  }

  const handleToggleSingleGroup = async () => {
    const newValue = !user?.singleGroupAutoEnter
    try {
      const { data } = await toggleSingleGroup({ variables: { enabled: newValue } })
      if (data?.toggleSingleGroupAutoEnter) {
        updateUser(data.toggleSingleGroupAutoEnter)
      }
      showSuccessToast(newValue ? 'Entrada directa activada' : 'Entrada directa desactivada')
    } catch (e: any) {
      showErrorToast(e.message || 'Error al cambiar la preferencia')
    }
  }

  const displayAvatar = avatarUrl || getImageUrl(user?.avatarUrl)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isEditing ? (
        <>
          <ScreenHeader title="Editar Perfil" showBack={false} />

          <View style={{ padding: 24 }}>
            <TouchableOpacity onPress={() => setAvatarPickerVisible(true)} style={{ alignItems: 'center', marginBottom: 32 }}>
              {displayAvatar ? (
                <Image
                  source={{ uri: displayAvatar }}
                  style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 8 }}
                />
              ) : (
                <View style={{
                  width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary,
                  justifyContent: 'center', alignItems: 'center', marginBottom: 8,
                }}>
                  <Text style={{ fontSize: 40, fontWeight: 'bold', color: colors.text }}>
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={{ color: colors.primary, fontSize: 14 }}>Cambiar foto</Text>
            </TouchableOpacity>

            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 6 }}>Nombre</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16,
                marginBottom: 20, borderWidth: 1, borderColor: colors.border, fontSize: 16,
              }}
            />

            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 6 }}>Teléfono</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Tu número de teléfono"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              style={{
                backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 16,
                marginBottom: 32, borderWidth: 1, borderColor: colors.border, fontSize: 16,
              }}
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                backgroundColor: colors.primary, borderRadius: 24, padding: 16, alignItems: 'center',
                opacity: saving ? 0.6 : 1, marginBottom: 12,
              }}
            >
              {saving ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Guardar cambios</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCancelEdit} style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <AvatarPickerModal
            visible={avatarPickerVisible}
            context="user"
            onSelect={handleAvatarSelected}
            onCancel={() => setAvatarPickerVisible(false)}
          />
        </>
      ) : (
        <>
          <ScreenHeader
            title="Mi Perfil"
            showBack={false}
            rightAction={
              <TouchableOpacity onPress={() => {
                setName(user?.name ?? '')
                setPhone(user?.phone ?? '')
                setAvatarUrl(null)
                setIsEditing(true)
              }} style={{
                backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
              }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Editar</Text>
              </TouchableOpacity>
            }
          />

          <View style={{ padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <ImageWithFallback
                source={{ uri: getImageUrl(user?.avatarUrl) }}
                style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
                fallback={
                  <View style={{
                    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
                    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
                  }}>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                }
              />
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>{user?.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{user?.email}</Text>
              {user?.phone && (
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>{user.phone}</Text>
              )}
            </View>

            <TouchableOpacity onPress={() => toggle()} style={{
              backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ color: colors.text, fontSize: 16 }}>Modo oscuro</Text>
              <View style={{
                width: 44, height: 24, borderRadius: 12,
                backgroundColor: isDark ? colors.primary : colors.border,
                justifyContent: 'center', paddingHorizontal: 2,
              }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface,
                  alignSelf: isDark ? 'flex-end' : 'flex-start',
                }} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToggleRoutine} style={{
              backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ color: colors.text, fontSize: 16 }}>Mostrar pestaña Rutina</Text>
              <View style={{
                width: 44, height: 24, borderRadius: 12,
                backgroundColor: user?.routineEnabled ? colors.primary : colors.border,
                justifyContent: 'center', paddingHorizontal: 2,
              }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface,
                  alignSelf: user?.routineEnabled ? 'flex-end' : 'flex-start',
                }} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToggleSingleGroup} style={{
              backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
            }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: colors.text, fontSize: 16 }}>Entrada directa a grupo</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Si solo estás en un grupo, ir directo a él
                </Text>
              </View>
              <View style={{
                width: 44, height: 24, borderRadius: 12,
                backgroundColor: user?.singleGroupAutoEnter ? colors.primary : colors.border,
                justifyContent: 'center', paddingHorizontal: 2,
              }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface,
                  alignSelf: user?.singleGroupAutoEnter ? 'flex-end' : 'flex-start',
                }} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={{
              backgroundColor: colors.error + '20', borderRadius: 16, padding: 16, marginTop: 12,
              alignItems: 'center',
            }}>
              <Text style={{ color: colors.error, fontWeight: '600', fontSize: 16 }}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}
