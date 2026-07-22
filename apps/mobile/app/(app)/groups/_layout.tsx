import { useEffect } from 'react'
import { BackHandler } from 'react-native'
import { Stack, useNavigation } from 'expo-router'
import { useTheme } from '../../../src/theme/ThemeProvider'

export default function GroupsLayout() {
  const { colors } = useTheme()
  const navigation = useNavigation()

  // Android hardware back button: navega hacia atrás en el Stack
  // en vez de salir al inicio del Tab.
  useEffect(() => {
    const onBackPress = () => {
      if (navigation.canGoBack()) {
        navigation.goBack()
        return true // consumimos el evento
      }
      return false // dejamos que el sistema lo maneje (salir de la app)
    }

    BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress)
  }, [navigation])

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
