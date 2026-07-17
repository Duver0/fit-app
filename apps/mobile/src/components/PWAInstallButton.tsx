import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { Ionicons } from '@expo/vector-icons'

// Extend WindowEventMap to include beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
    appinstalled: Event
  }
}

/**
 * Floating PWA install button.
 * Only shows on web when:
 *  - The app is NOT already running as PWA (display-mode: standalone)
 *  - The beforeinstallprompt event has fired (browser supports PWA install)
 *  - The app hasn't been installed yet
 */
export default function PWAInstallButton() {
  const { colors } = useTheme()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'web') return

    // Check if already running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = () => {
    setDismissed(true)
  }

  // Don't show on native platforms, if installed, if dismissed, or if prompt not available
  if (Platform.OS !== 'web' || isInstalled || dismissed || !deferredPrompt) {
    return null
  }

  // Use a div with fixed positioning for web; React Native doesn't support position:fixed
  return (
    <View
      // @ts-expect-error - position:fixed is web-only but needed for floating button
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 9999,
      }}
    >
      <TouchableOpacity
        onPress={handleInstall}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primary,
          borderRadius: 28,
          paddingHorizontal: 20,
          paddingVertical: 14,
          gap: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="download-outline" size={22} color={colors.text} />
        <View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
            Instalar app
          </Text>
          <Text style={{ color: colors.text, fontSize: 11, opacity: 0.8 }}>
            Sin descargas ni configuraciones
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginLeft: 4, padding: 4 }}
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  )
}
