import { View } from 'react-native'
import { Tabs, Redirect } from 'expo-router'
import { useTheme } from '../../src/theme/ThemeProvider'
import { useAuthStore } from '../../src/stores/authStore'
import InvitationBell from '../../src/components/InvitationBell'

export default function AppLayout() {
  const { colors } = useTheme()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen name="(tabs)" options={{ headerShown: false }} />
      </Tabs>

      <View style={{
        position: 'absolute', top: 50, right: 12, zIndex: 100,
      }}>
        <InvitationBell />
      </View>
    </View>
  )
}
