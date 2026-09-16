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
 * Register for Web Push notifications (PWA in browser).
 * Returns the endpoint string on success, null on failure.
 */
async function registerWebPush(): Promise<string | null> {
  console.log('[Push] Starting registration...')

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Web Push not supported')
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

  // Register Service Worker (detect base path for GitHub Pages subpath)
  const swPath = window.location.pathname.includes('/fit-app/')
    ? '/fit-app/sw.js'
    : '/sw.js'

  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.register(swPath)
    await navigator.serviceWorker.ready
    console.log('[Push] Service Worker ready')
  } catch (error) {
    console.error('[Push] SW registration failed:', error)
    return null
  }

  // Check existing subscription or create new one
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    try {
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
      console.log('[Push] Subscription created')
    } catch (error) {
      console.error('[Push] Subscribe failed:', error)
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
    console.log('[Push] Registered in backend, id:', data?.registerWebPushSubscription?.id)
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
