import { useEffect, useRef, useCallback } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { gql } from '@apollo/client'
import { client } from '../lib/apollo'
import { useAuthStore } from '../stores/authStore'

const VAPID_KEY_QUERY = gql`
  query VapidPublicKey {
    vapidPublicKey
  }
`

const REGISTER_WEB_PUSH_MUTATION = gql`
  mutation RegisterWebPushSubscription($input: RegisterWebPushSubscriptionInput!) {
    registerWebPushSubscription(input: $input) {
      id
    }
  }
`

/**
 * Simplified push notification hook for PWA only.
 * Uses Web Push API with VAPID keys via Service Worker.
 */
export function useNotifications() {
  const router = useRouter()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasRegistered = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || hasRegistered.current) return
    if (Platform.OS !== 'web') return

    hasRegistered.current = true
    registerWebPush()
  }, [isAuthenticated])

  // Handle notification clicks — the SW handles this on web,
  // but we can listen for messages from the SW
  useEffect(() => {
    if (Platform.OS !== 'web') return

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const { groupId, exerciseId } = event.data
        if (groupId && exerciseId) {
          router.push(`/groups/${groupId}/exercises/${exerciseId}`)
        } else if (groupId) {
          router.push(`/groups/${groupId}`)
        }
      }
    }

    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [router])
}

async function registerWebPush() {
  console.log('[Push] Starting Web Push registration...')

  // Feature detection
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Workers not supported')
    return
  }
  if (!('PushManager' in window)) {
    console.warn('[Push] Push API not supported')
    return
  }
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications API not supported')
    return
  }
  if (!window.isSecureContext) {
    console.warn('[Push] Not a secure context (HTTPS required)')
    return
  }

  console.log('[Push] Browser supports Web Push ✓')

  // Request notification permission
  let permission = Notification.permission
  console.log('[Push] Current permission:', permission)

  if (permission === 'default') {
    console.log('[Push] Requesting permission...')
    permission = await Notification.requestPermission()
    console.log('[Push] Permission result:', permission)
  }

  if (permission !== 'granted') {
    console.warn('[Push] Permission not granted:', permission)
    return
  }

  console.log('[Push] Permission granted ✓')

  // Wait for Service Worker to be ready
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.ready
    console.log('[Push] SW ready, scope:', registration.scope)
  } catch (error) {
    console.error('[Push] Service Worker not ready:', error)
    return
  }

  // Check existing subscription
  let subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    console.log('[Push] Existing subscription found, sending to backend...')
    await sendSubscriptionToBackend(subscription)
    return
  }

  console.log('[Push] No existing subscription, creating new one...')

  // Get VAPID public key from backend
  let vapidKey: string | null = null
  try {
    const { data, errors } = await client.query({
      query: VAPID_KEY_QUERY,
      fetchPolicy: 'network-only',
    })
    if (errors) {
      console.error('[Push] Failed to fetch VAPID key:', errors)
      return
    }
    vapidKey = data?.vapidPublicKey
  } catch (error) {
    console.error('[Push] Error fetching VAPID key:', error)
    return
  }

  if (!vapidKey) {
    console.warn('[Push] VAPID public key not configured on backend')
    return
  }

  console.log('[Push] VAPID key obtained ✓')

  // Create push subscription
  try {
    const applicationServerKey = urlBase64ToUint8Array(vapidKey)
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    console.log('[Push] New subscription created ✓')
    await sendSubscriptionToBackend(subscription)
  } catch (error: any) {
    const name = error?.name || 'Unknown'
    console.error(`[Push] Subscribe failed (${name}):`, error?.message)

    if (name === 'AbortError') {
      console.error('[Push] The push service (FCM) could not be reached.')
      console.error('[Push] Check: HTTPS, Google Play Services, network')
    } else if (name === 'NotAllowedError') {
      console.error('[Push] Permission denied or no user gesture')
    }
  }
}

async function sendSubscriptionToBackend(subscription: PushSubscription) {
  const sub = subscription.toJSON()
  if (!sub.endpoint) {
    console.error('[Push] Subscription has no endpoint')
    return
  }

  try {
    const { data, errors } = await client.mutate({
      mutation: REGISTER_WEB_PUSH_MUTATION,
      variables: {
        input: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh || '',
            auth: sub.keys?.auth || '',
          },
        },
      },
    })
    if (errors) {
      console.error('[Push] Backend registration failed:', errors)
      return
    }
    console.log('[Push] ✅ Subscription registered in backend, id:', data?.registerWebPushSubscription?.id)
  } catch (error) {
    console.error('[Push] Error sending to backend:', error)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
