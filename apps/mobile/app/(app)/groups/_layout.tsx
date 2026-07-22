import { Stack } from 'expo-router'

export default function GroupsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Grupos' }} />
      <Stack.Screen name="create" options={{ title: 'Crear Grupo' }} />
      <Stack.Screen name="[groupId]/index" options={{ title: 'Grupo' }} />
      <Stack.Screen name="[groupId]/members" options={{ title: 'Miembros' }} />
      <Stack.Screen name="[groupId]/settings" options={{ title: 'Ajustes' }} />
      <Stack.Screen name="[groupId]/exercises/[exerciseId]" options={{ title: 'Ejercicio' }} />
      <Stack.Screen name="[groupId]/categories/[categoryId]" options={{ title: 'Categoría' }} />
    </Stack>
  )
}
