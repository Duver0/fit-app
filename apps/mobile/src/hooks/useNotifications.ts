import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { registerForPushNotificationsAsync } from '../lib/notifications'

/**
 * Hook to handle push notifications.
 * - Registers for push notifications on mount
 * - Handles notification taps (deep linking to group/exercise)
 */
export function useNotifications() {
  const router = useRouter()

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync()

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
  }, [])
}
