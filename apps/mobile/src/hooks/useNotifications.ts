import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { registerForPushNotificationsAsync } from '../lib/notifications'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to handle push notifications.
 * - Registers for push notifications on mount (only when authenticated)
 * - On native: handles notification taps (deep linking)
 * - On web: notification clicks are handled by the Service Worker (sw.js)
 */
export function useNotifications() {
  const router = useRouter()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasRegistered = useRef(false)

  useEffect(() => {
    // Only register when authenticated and not yet registered
    if (!isAuthenticated || hasRegistered.current) {
      return
    }

    // Mark as registered to avoid duplicate calls
    hasRegistered.current = true

    // Register for push notifications
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          console.log('[Push] Registration completed:', token.substring(0, 30) + '...')
        }
      })
      .catch((error) => {
        console.error('[Push] Registration failed in hook:', error)
      })
  }, [isAuthenticated])

  // Handle notification taps — only on native (expo-notifications)
  // On web, the Service Worker handles notificationclick events
  useEffect(() => {
    if (Platform.OS === 'web') return

    let responseSubscription: any = null

    import('expo-notifications').then((Notifications) => {
      responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data

        if (data.groupId && data.exerciseId) {
          router.push(`/groups/${data.groupId}/exercises/${data.exerciseId}`)
        } else if (data.groupId) {
          router.push(`/groups/${data.groupId}`)
        }
      })
    })

    return () => {
      responseSubscription?.remove()
    }
  }, [router])
}
