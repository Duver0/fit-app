import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ApolloProvider } from '@apollo/client'
import { ThemeProvider } from '../src/theme/ThemeProvider'
import { client } from '../src/lib/apollo'
import { patchHistoryForBasePath } from '../src/lib/historyPatch'
import { registerServiceWorker } from '../src/lib/registerSW'
import PWAInstallButton from '../src/components/PWAInstallButton'

// Fix client-side navigation on GitHub Pages subpath deployments.
// Must run before any navigation occurs.
if (typeof window !== 'undefined') {
  patchHistoryForBasePath()
}

export default function RootLayout() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <ApolloProvider client={client}>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        {/* PWA install button — shown on all screens, fixed position */}
        <PWAInstallButton />
      </ThemeProvider>
    </ApolloProvider>
  )
}
