import { Stack } from 'expo-router'

export default function RoutineLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[day]" />
    </Stack>
  )
}
