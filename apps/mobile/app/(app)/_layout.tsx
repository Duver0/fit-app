import { View } from 'react-native'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../src/theme/ThemeProvider'
import { useAuthStore } from '../../src/stores/authStore'
import TabBarButton from '../../src/components/ui/TabBarButton'

export default function AppLayout() {
  const { colors } = useTheme()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const isAdmin = user?.role === 'SUPER_ADMIN'
  const routineEnabled = user?.routineEnabled === true

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
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="groups"
          options={{
            title: 'Grupos',
            tabBarLabel: 'Grupos',
            tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
            tabBarButton: (props) => (
              <TabBarButton {...props} rootHref="/(app)/groups" />
            ),
          }}
        />
        <Tabs.Screen
          name="routine"
          options={{
            title: 'Rutina',
            tabBarLabel: 'Rutina',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
            tabBarButton: routineEnabled
              ? (props) => <TabBarButton {...props} rootHref="/(app)/routine" />
              : () => <View style={{ display: 'none' }} />,
          }}
        />
        <Tabs.Screen
          name="timer"
          options={{
            title: 'Timer',
            tabBarLabel: 'Timer',
            tabBarIcon: ({ color, size }) => <Ionicons name="timer" size={size} color={color} />,
            tabBarButton: (props) => (
              <TabBarButton {...props} rootHref="/(app)/timer" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarLabel: 'Perfil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
            tabBarButton: (props) => (
              <TabBarButton {...props} rootHref="/(app)/profile" />
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
            tabBarButton: isAdmin
              ? (props) => <TabBarButton {...props} rootHref="/(app)/admin" />
              : () => <View style={{ display: 'none' }} />,
          }}
        />
      </Tabs>
    </View>
  )
}
