import { Stack } from 'expo-router'
import { useTheme } from '../../../../src/theme/ThemeProvider'

export default function GroupsLayout() {
  const { colors } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        tabBarLabel: 'Grupos',
        title: 'Grupos',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Grupos', tabBarLabel: 'Grupos' }} />
      <Stack.Screen name="create" options={{ title: 'Crear Grupo', tabBarLabel: 'Grupos' }} />
      <Stack.Screen name="[groupId]/index" options={{ title: 'Grupo', tabBarLabel: 'Grupos' }} />
      <Stack.Screen name="[groupId]/members" options={{ title: 'Miembros', tabBarLabel: 'Grupos' }} />
      <Stack.Screen name="[groupId]/settings" options={{ title: 'Ajustes', tabBarLabel: 'Grupos' }} />
      <Stack.Screen
        name="[groupId]/exercises/[exerciseId]"
        options={{ title: 'Ejercicio', tabBarLabel: 'Grupos' }}
      />
    </Stack>
  )
}
