import { useEffect, useRef } from 'react'
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
 * Push notification hook for PWA.
 * Registers the Service Worker + Web Push subscription.
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

  // Handle notification clicks from the SW
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
  console.log('[Push] ===== Starting registration =====')

  // Feature detection
  if (!('serviceWorker' in navigator)) {
    console.error('[Push] ❌ Service Workers NOT supported')
    return
  }
  if (!('PushManager' in window)) {
    console.error('[Push] ❌ Push API NOT supported')
    return
  }
  if (!('Notification' in window)) {
    console.error('[Push] ❌ Notifications API NOT supported')
    return
  }
  if (!window.isSecureContext) {
    console.error('[Push] ❌ Not a secure context (need HTTPS)')
    return
  }
  console.log('[Push] ✓ Browser supports Web Push')

  // Permission
  let permission = Notification.permission
  console.log('[Push] Permission:', permission)

  if (permission === 'default') {
    permission = await Notification.requestPermission()
    console.log('[Push] Permission after request:', permission)
  }

  if (permission !== 'granted') {
    console.warn('[Push] ❌ Permission not granted:', permission)
    return
  }
  console.log('[Push] ✓ Permission granted')

  // Register Service Worker explicitly (don't depend on registerSW timing)
  let registration: ServiceWorkerRegistration
  try {
    // First check if there's already a registered SW
    const existingReg = await navigator.serviceWorker.getRegistration('/fit-app/')
    if (existingReg) {
      console.log('[Push] ✓ Found existing SW registration, scope:', existingReg.scope)
      registration = existingReg
    } else {
      console.log('[Push] No existing SW, registering /fit-app/sw.js ...')
      registration = await navigator.serviceWorker.register('/fit-app/sw.js', {
        scope: '/fit-app/',
      })
      console.log('[Push] ✓ SW registered, scope:', registration.scope)
    }

    // Make sure the SW is active (not just installing)
    if (registration.installing) {
      console.log('[Push] SW is installing, waiting...')
      await waitForSWActive(registration)
    } else if (registration.waiting) {
      console.log('[Push] SW is waiting, activating...')
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      await waitForSWActive(registration)
    }

    console.log('[Push] ✓ SW active and ready')
  } catch (error: any) {
    console.error('[Push] ❌ SW registration failed:', error?.name, error?.message)
    return
  }

  // Check existing push subscription
  let subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    console.log('[Push] ✓ Existing push subscription found')
    await sendSubscriptionToBackend(subscription)
    return
  }

  console.log('[Push] No push subscription, creating one...')

  // Get VAPID key from backend
  let vapidKey: string | null = null
  try {
    const { data, errors } = await client.query({
      query: VAPID_KEY_QUERY,
      fetchPolicy: 'network-only',
    })
    if (errors) {
      console.error('[Push] ❌ Failed to fetch VAPID key:', errors)
      return
    }
    vapidKey = data?.vapidPublicKey
  } catch (error) {
    console.error('[Push] ❌ Error fetching VAPID key:', error)
    return
  }

  if (!vapidKey) {
    console.error('[Push] ❌ VAPID public key not configured on backend!')
    console.error('[Push]    Check VAPID_PUBLIC_KEY in .env')
    return
  }
  console.log('[Push] ✓ VAPID key obtained:', vapidKey.substring(0, 20) + '...')

  // Subscribe to push
  try {
    const applicationServerKey = urlBase64ToUint8Array(vapidKey)
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    console.log('[Push] ✓ Push subscription created!')
    await sendSubscriptionToBackend(subscription)
  } catch (error: any) {
    const name = error?.name || 'Unknown'
    console.error(`[Push] ❌ Subscribe failed (${name}):`, error?.message)

    if (name === 'AbortError') {
      console.error('[Push]    Push service (FCM) unreachable — check HTTPS & network')
    } else if (name === 'NotAllowedError') {
      console.error('[Push]    Permission denied or missing user gesture')
    } else if (name === 'InvalidStateError') {
      console.error('[Push]    Subscription already exists or SW not ready')
    } else if (name === 'SecurityError') {
      console.error('[Push]    Security error — must be HTTPS')
    }
  }

  console.log('[Push] ===== Registration finished =====')
}

function waitForSWActive(registration: ServiceWorkerRegistration): Promise<void> {
  return new Promise((resolve) => {
    const sw = registration.installing || registration.waiting
    if (!sw) {
      resolve()
      return
    }

    const onStateChange = () => {
      console.log('[Push] SW state:', sw.state)
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', onStateChange)
        resolve()
      }
    }

    sw.addEventListener('statechange', onStateChange)

    // Timeout after 10 seconds
    setTimeout(() => {
      sw.removeEventListener('statechange', onStateChange)
      console.warn('[Push] ⚠️ SW activation timed out, continuing anyway')
      resolve()
    }, 10000)
  })
}

async function sendSubscriptionToBackend(subscription: PushSubscription) {
  const sub = subscription.toJSON()
  if (!sub.endpoint) {
    console.error('[Push] ❌ Subscription has no endpoint')
    return
  }
  console.log('[Push] Sending subscription to backend...')
  console.log('[Push]   Endpoint:', sub.endpoint.substring(0, 60) + '...')

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
      console.error('[Push] ❌ Backend registration failed:', errors)
      return
    }
    console.log('[Push] ✅ Subscription registered in backend, id:', data?.registerWebPushSubscription?.id)
  } catch (error) {
    console.error('[Push] ❌ Error sending to backend:', error)
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
