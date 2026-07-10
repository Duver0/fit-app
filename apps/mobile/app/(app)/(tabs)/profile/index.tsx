import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../../src/stores/authStore'
import { useThemeStore } from '../../../../src/stores/themeStore'

export default function ProfileScreen() {
  const { colors } = useTheme()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.clearAuth)
  const { isDark, toggle } = useThemeStore()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 24 }}>Mi Perfil</Text>

        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center', marginBottom: 12,
          }}>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text }}>{user?.name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{user?.email}</Text>
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

        <TouchableOpacity onPress={() => router.push('/(app)/invitations')} style={{
          backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          borderWidth: 1, borderColor: colors.border,
        }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>Invitaciones pendientes</Text>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Ver</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={{
          backgroundColor: colors.error + '20', borderRadius: 16, padding: 16, marginTop: 24,
          alignItems: 'center',
        }}>
          <Text style={{ color: colors.error, fontWeight: '600', fontSize: 16 }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
