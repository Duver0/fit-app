import { Tabs } from 'expo-router'
import { useTheme } from '../../src/theme/ThemeProvider'

export default function AppLayout() {
  const { colors } = useTheme()

  return (
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
  )
}
