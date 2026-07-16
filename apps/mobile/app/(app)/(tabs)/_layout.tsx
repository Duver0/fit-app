import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../src/theme/ThemeProvider'
import { useAuthStore } from '../../../src/stores/authStore'

export default function TabsLayout() {
  const { colors } = useTheme()
  const user = useAuthStore(state => state.user)
  const isAdmin = user?.role === 'SUPER_ADMIN'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          tabBarLabel: 'Grupos',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
          tabBarButton: isAdmin ? undefined : () => <View style={{ display: 'none' }} />,
        }}
      />
    </Tabs>
  )
}
