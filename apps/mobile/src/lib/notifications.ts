import { Platform } from 'react-native'
import { gql } from '@apollo/client'
import { client } from './apollo'

const VAPID_PUBLIC_KEY_QUERY = gql`
  query VapidPublicKey {
    vapidPublicKey
  }
`

const REGISTER_WEB_PUSH_SUBSCRIPTION_MUTATION = gql`
  mutation RegisterWebPushSubscription($input: RegisterWebPushSubscriptionInput!) {
    registerWebPushSubscription(input: $input) {
      id
      token
      platform
    }
  }
`

const REGISTER_DEVICE_TOKEN_MUTATION = gql`
  mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {
    registerDeviceToken(input: $input) {
      id
      token
      platform
    }
  }
`

const REMOVE_DEVICE_TOKEN_MUTATION = gql`
  mutation RemoveDeviceToken($token: String!) {
    removeDeviceToken(token: $token)
  }
`

/**
 * Convert a VAPID public key (base64url) to Uint8Array for the Push API.
 */
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

/**
 * Diagnose why push subscription might fail.
 */
function diagnosePushSupport(): string | null {
  if (!('serviceWorker' in navigator)) return 'Service Workers not supported'
  if (!('PushManager' in window)) return 'Push API not supported by this browser'
  if (!('Notification' in window)) return 'Notifications API not supported'
  if (!window.isSecureContext) return 'Not a secure context (must be HTTPS)'
  return null
}

/**
 * Register for Web Push notifications (PWA in browser).
 */
async function registerWebPush(): Promise<string | null> {
  console.log('[Push] Starting registration...')

  // Feature detection
  const notSupported = diagnosePushSupport()
  if (notSupported) {
    console.warn('[Push]', notSupported)
    return null
  }

  // Notification permission
  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    console.warn('[Push] Permission not granted:', permission)
    return null
  }

  // Fetch VAPID public key from backend
  let vapidPublicKey: string | null = null
  try {
    const { data, errors } = await client.query({
      query: VAPID_PUBLIC_KEY_QUERY,
      fetchPolicy: 'network-only',
    })
    if (errors) {
      console.error('[Push] Failed to fetch VAPID key:', errors)
      return null
    }
    vapidPublicKey = data?.vapidPublicKey
  } catch (error) {
    console.error('[Push] Error fetching VAPID key:', error)
    return null
  }

  if (!vapidPublicKey) {
    console.warn('[Push] VAPID public key not configured on backend')
    return null
  }

  // Use the already-active Service Worker (registered by Expo or previously)
  // Do NOT re-register — it can cause scope conflicts
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.ready
    console.log('[Push] SW active, scope:', registration.scope)
  } catch (error) {
    console.error('[Push] No active Service Worker:', error)
    return null
  }

  // Check existing subscription or create new one
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      console.log('[Push] Key length:', applicationServerKey.length, 'bytes (expect 65)')
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
      console.log('[Push] Subscription created successfully')
    } catch (error: any) {
      // Provide specific diagnosis for common errors
      const name = error?.name || 'Unknown'
      const msg = error?.message || String(error)

      if (name === 'AbortError') {
        console.error(
          '[Push] ❌ Push service error — your browser/device could not reach the push service (FCM).',
          '\n  • Are you using Chrome for Android? Other browsers may not work.',
          '\n  • Does your device have Google Play Services?',
          '\n  • Is your network blocking FCM connections?',
          '\n  Error:', msg,
        )
      } else if (name === 'NotAllowedError') {
        console.error('[Push] Permission denied or no user gesture:', msg)
      } else if (name === 'InvalidStateError') {
        console.error('[Push] Service Worker not ready:', msg)
      } else if (name === 'SecurityError') {
        console.error('[Push] Security error (HTTPS required):', msg)
      } else {
        console.error(`[Push] Subscribe failed (${name}):`, msg)
      }
      return null
    }
  } else {
    console.log('[Push] Existing subscription found')
  }

  // Send subscription to backend
  const subscriptionJson = subscription.toJSON()
  try {
    const { data, errors } = await client.mutate({
      mutation: REGISTER_WEB_PUSH_SUBSCRIPTION_MUTATION,
      variables: {
        input: {
          endpoint: subscriptionJson.endpoint,
          keys: {
            p256dh: subscriptionJson.keys?.p256dh || '',
            auth: subscriptionJson.keys?.auth || '',
          },
        },
      },
    })
    if (errors) {
      console.error('[Push] Backend registration failed:', errors)
      return null
    }
    console.log('[Push] ✅ Registered in backend, id:', data?.registerWebPushSubscription?.id)
  } catch (error) {
    console.error('[Push] Error sending to backend:', error)
    return null
  }

  return subscriptionJson.endpoint || null
}

/**
 * Register for native push notifications (Expo - iOS/Android).
 */
async function registerExpoPush(): Promise<string | null> {
  const Notifications = await import('expo-notifications')
  const Device = await import('expo-device')

  if (!Device.isDevice) {
    console.log('[Push] Physical device required for Expo push')
    return null
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Expo permission not granted')
    return null
  }

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const token = tokenData.data

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  await client.mutate({
    mutation: REGISTER_DEVICE_TOKEN_MUTATION,
    variables: { input: { token, platform: Platform.OS } },
  })

  console.log('[Push] Expo token registered')
  return token
}

/**
 * Main entry point — detects platform and registers accordingly.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await registerWebPush()
    } else {
      return await registerExpoPush()
    }
  } catch (error) {
    console.error('[Push] Registration error:', error)
    return null
  }
}

/**
 * Remove the device token from the backend (e.g., on logout).
 */
export async function removeDeviceToken(token: string): Promise<void> {
  try {
    await client.mutate({
      mutation: REMOVE_DEVICE_TOKEN_MUTATION,
      variables: { token },
    })
  } catch (error) {
    console.error('[Push] Error removing token:', error)
  }
}
