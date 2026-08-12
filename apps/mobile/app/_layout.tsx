import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ApolloProvider, useQuery } from '@apollo/client'
import { ThemeProvider } from '../src/theme/ThemeProvider'
import { client } from '../src/lib/apollo'
import { ME_QUERY } from '../src/lib/graphql'
import { useAuthStore } from '../src/stores/authStore'
import { ToastContainer } from '../src/components/ui/Toast'
import { patchHistoryForBasePath } from '../src/lib/historyPatch'
import { registerServiceWorker } from '../src/lib/registerSW'
import PWAInstallButton from '../src/components/PWAInstallButton'
import { RealtimeProvider } from '../src/components/RealtimeProvider'

// Refreshes the persisted user from the server whenever a session is active.
// Rendered INSIDE <ApolloProvider> so it can use useQuery. This keeps
// routineEnabled / singleGroupAutoEnter in sync with the backend, so per-user
// preferences are applied automatically on cold start and after re-login.
function UserSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const updateUser = useAuthStore((state) => state.updateUser)
  const { data: meData } = useQuery(ME_QUERY, { skip: !isAuthenticated })
  useEffect(() => {
    if (meData?.me) updateUser(meData.me)
  }, [meData, updateUser])
  return null
}

// Fix client-side navigation on GitHub Pages subpath deployments.
// Must run before any navigation occurs.
if (typeof window !== 'undefined') {
  patchHistoryForBasePath()
}

export default function RootLayout() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const handleSWUpdate = useCallback(() => {
    setUpdateAvailable(true)
  }, [])

  const handleRefresh = useCallback(() => {
    // Send SKIP_WAITING to the waiting SW, then the 'controllerchange'
    // event in registerSW.ts will trigger a reload.
    navigator.serviceWorker?.getRegistration()?.then((reg) => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    })
    setUpdateAvailable(false)
  }, [])

  useEffect(() => {
    registerServiceWorker(handleSWUpdate)
  }, [handleSWUpdate])

  return (
    <ApolloProvider client={client}>
      <SafeAreaProvider>
        <ThemeProvider>
        <UserSync />
        <RealtimeProvider />
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        {/* PWA install button — shown on all screens, fixed position */}
        <PWAInstallButton />

        {/* Toast container — muestra notificaciones flotantes de error/éxito */}
        <ToastContainer />

        {/* Update available banner */}
        {updateAvailable && (
          <View
            // @ts-expect-error - position:fixed is web-only but correct for this overlay
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10000,
              backgroundColor: '#FF6B35',
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 }}>
              Nueva versión disponible
            </Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: '#FF6B35', fontWeight: '700', fontSize: 13 }}>
                Actualizar
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ThemeProvider>
      </SafeAreaProvider>
    </ApolloProvider>
  )
}
