import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useMutation } from '@apollo/client'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../../src/stores/authStore'
import { UPDATE_PROFILE_MUTATION } from '../../../../src/lib/graphql'

export default function EditProfileScreen() {
  const { colors } = useTheme()
  const user = useAuthStore(state => state.user)
  const updateUser = useAuthStore(state => state.updateUser)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION)

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      const variables: Record<string, string> = { name: name.trim() }
      if (phone.trim()) variables.phone = phone.trim()
      if (avatarUri) variables.avatarUrl = avatarUri

      const { data } = await updateProfile({ variables })

      if (data?.updateProfile) {
        updateUser(data.updateProfile)
      }

      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Ocurrió un error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const displayAvatar = avatarUri || user?.avatarUrl

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 24, paddingTop: 60 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Volver</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 32 }}>
          Editar Perfil
        </Text>

        <TouchableOpacity onPress={handlePickImage} style={{ alignItems: 'center', marginBottom: 32 }}>
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
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}
