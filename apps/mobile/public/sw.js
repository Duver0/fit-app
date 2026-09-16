/**
 * Fit App — Service Worker
 *
 * Provides offline fallback and PWA installability.
 * Deployed alongside the SPA at /fit-app/sw.js on GitHub Pages.
 *
 * The BASE_PATH is computed dynamically from the script's own location,
 * so it works on both root (/) and subpath (/fit-app/) deployments.
 *
 * Strategy: Network-first with stale-while-revalidate for assets.
 * - App shell (root, index.html) is precached at install time.
 * - Dynamic requests try the network first; on failure, serve from cache.
 * - Successful responses are cached for future offline use.
 * - Old cache versions are cleaned up on activation.
 */

const CACHE_NAME = 'fit-app-v2'
const BASE_PATH = self.location.pathname.replace('/sw.js', '')
const PRECACHE_URLS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
]

// ----- INSTALL: precache the app shell -----
self.addEventListener('install', (event) => {
  console.log('[PWA SW] Installing v2, precaching app shell...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use addAll() which fails atomically if any resource fails
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => {
        console.log('[PWA SW] App shell precached successfully')
        return self.skipWaiting()
      })
      .catch((err) => {
        console.warn('[PWA SW] Precaching failed (non-critical):', err)
        // Still activate even if precaching partially fails
        self.skipWaiting()
      }),
  )
})

// ----- MESSAGE: handle SKIP_WAITING for immediate activation -----
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[PWA SW] SKIP_WAITING received, activating new version...')
    self.skipWaiting()
  }
})

// ----- ACTIVATE: clean old caches and take control -----
self.addEventListener('activate', (event) => {
  console.log('[PWA SW] Activating v2, cleaning old caches...')
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      clients.claim(),
      // Delete any caches that don't match the current version
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[PWA SW] Deleting old cache:', name)
              return caches.delete(name)
            }),
        )
      }),
    ]).then(() => {
      console.log('[PWA SW] Activated v2, ready for offline use')
    }),
  )
})

// ----- FETCH: network-first with cache fallback -----
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip non-http(s) requests (e.g., chrome-extension://)
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for future offline use
        if (response.ok || response.type === 'opaqueredirect') {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            // Don't cache opaque responses (cors opaque) by default
            if (response.type !== 'opaque') {
              cache.put(event.request, cloned)
            }
          })
        }
        return response
      })
      .catch(() => {
        // Network failed — try the cache
        return caches.match(event.request).then((cached) => {
          if (cached) {
            console.log('[PWA SW] Serving from cache:', event.request.url)
            return cached
          }
          // Nothing in cache either — return a minimal offline page
          console.warn('[PWA SW] No cache for:', event.request.url)
          if (event.request.mode === 'navigate') {
            return caches.match(BASE_PATH + '/')
          }
          return new Response('Offline', { status: 503 })
        })
      }),
  )
})

// ----- PUSH: handle incoming push notifications -----
self.addEventListener('push', (event) => {
  console.log('[PWA SW] Push received:', event)

  let data = { title: 'Notificación', body: '', data: {} }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      console.warn('[PWA SW] Failed to parse push data:', e)
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: BASE_PATH + '/icon-192x192.png',
    badge: BASE_PATH + '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// ----- NOTIFICATIONCLICK: handle notification tap -----
self.addEventListener('notificationclick', (event) => {
  console.log('[PWA SW] Notification clicked:', event)

  event.notification.close()

  const data = event.notification.data

  // Determine the URL to open
  let url = BASE_PATH + '/'
  if (data?.groupId && data?.exerciseId) {
    url = BASE_PATH + `/groups/${data.groupId}/exercises/${data.exerciseId}`
  } else if (data?.groupId) {
    url = BASE_PATH + `/groups/${data.groupId}`
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(BASE_PATH) && 'focus' in client) {
          // Navigate to the relevant page and focus
          client.navigate(url)
          return client.focus()
        }
      }
      // Open a new window if none is open
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
