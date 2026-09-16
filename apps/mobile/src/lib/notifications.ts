import { Platform } from 'react-native'
import { gql } from '@apollo/client'
import { client } from './apollo'

// GraphQL queries and mutations
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
 * Convert a VAPID public key (base64) to Uint8Array for the Push API
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

/**
 * Register for Web Push notifications (PWA in browser)
 */
async function registerWebPush(): Promise<string | null> {
  console.log('[Push] Starting Web Push registration...')

  // Check if Service Workers and Push API are supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Web Push not supported in this browser')
    return null
  }
  console.log('[Push] Service Worker and Push API supported')

  // Check notification permission
  let permission = Notification.permission
  if (permission === 'default') {
    console.log('[Push] Requesting notification permission...')
    permission = await Notification.requestPermission()
  }
  console.log('[Push] Notification permission:', permission)

  if (permission !== 'granted') {
    console.warn('[Push] Notification permission not granted')
    return null
  }

  // Get VAPID public key from backend
  console.log('[Push] Fetching VAPID public key...')
  let vapidPublicKey: string | null = null
  try {
    const { data, errors } = await client.query({
      query: VAPID_PUBLIC_KEY_QUERY,
      fetchPolicy: 'network-only',
    })
    if (errors) {
      console.error('[Push] GraphQL errors fetching VAPID key:', errors)
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
  console.log('[Push] VAPID public key obtained:', vapidPublicKey.substring(0, 20) + '...')

  // Register Service Worker (detect base path for subpath deployments like GitHub Pages)
  const swPath = window.location.pathname.includes('/fit-app/')
    ? '/fit-app/sw.js'
    : '/sw.js'
  console.log('[Push] Registering Service Worker at:', swPath)
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.register(swPath)
    console.log('[Push] Service Worker registered:', registration.scope)
    await navigator.serviceWorker.ready
    console.log('[Push] Service Worker ready')
  } catch (error) {
    console.error('[Push] Error registering Service Worker:', error)
    return null
  }

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    console.log('[Push] Already subscribed, sending to backend...')
  } else {
    // Subscribe to push notifications
    console.log('[Push] Creating new push subscription...')
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      console.log('[Push] Push subscription created')
    } catch (error) {
      console.error('[Push] Error creating push subscription:', error)
      return null
    }
  }

  // Send subscription to backend
  const subscriptionJson = subscription.toJSON()
  console.log('[Push] Sending subscription to backend...')
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
      console.error('[Push] GraphQL errors registering subscription:', errors)
      return null
    }
    console.log('[Push] Subscription registered in backend:', data?.registerWebPushSubscription?.id)
  } catch (error) {
    console.error('[Push] Error sending subscription to backend:', error)
    return null
  }

  return subscriptionJson.endpoint || null
}

/**
 * Register for native push notifications (Expo - iOS/Android)
 */
async function registerExpoPush(): Promise<string | null> {
  const Notifications = await import('expo-notifications')
  const Device = await import('expo-device')

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  // Configure how notifications appear when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications')
    return null
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync()
  const token = tokenData.data

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  // Register token with backend
  await client.mutate({
    mutation: REGISTER_DEVICE_TOKEN_MUTATION,
    variables: {
      input: {
        token,
        platform: Platform.OS,
      },
    },
  })

  console.log('Expo push token registered successfully')
  return token
}

/**
 * Main function to register for push notifications.
 * Automatically detects platform and uses the appropriate method.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await registerWebPush()
    } else {
      return await registerExpoPush()
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error)
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
    console.log('Device token removed successfully')
  } catch (error) {
    console.error('Error removing device token:', error)
  }
}
