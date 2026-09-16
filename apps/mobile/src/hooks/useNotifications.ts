import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { registerForPushNotificationsAsync } from '../lib/notifications'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to handle push notifications.
 * - Registers for push notifications on mount (only when authenticated)
 * - Handles notification taps (deep linking to group/exercise)
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
          console.log('Push notifications registered:', token)
        }
      })
      .catch((error) => {
        console.error('Failed to register push notifications:', error)
      })

    // Handle notification taps (when app is in background/killed)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data

      // Navigate to the corresponding group/exercise
      if (data.groupId && data.exerciseId) {
        router.push(`/groups/${data.groupId}/exercises/${data.exerciseId}`)
      } else if (data.groupId) {
        router.push(`/groups/${data.groupId}`)
      }
    })

    return () => {
      responseSubscription.remove()
    }
  }, [isAuthenticated])
}
