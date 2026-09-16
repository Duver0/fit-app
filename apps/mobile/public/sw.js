/**
 * Fit App — Service Worker
 *
 * Provides offline fallback, PWA installability, and push notifications.
 * Deployed at /fit-app/sw.js on GitHub Pages.
 */

const CACHE_NAME = 'fit-app-v2'
const BASE_PATH = self.location.pathname.replace('/sw.js', '')
const PRECACHE_URLS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
]

// ----- INSTALL: precache the app shell -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

// ----- MESSAGE: handle SKIP_WAITING for immediate activation -----
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ----- ACTIVATE: clean old caches and take control -----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
    ]),
  )
})

// ----- FETCH: network-first with cache fallback -----
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type !== 'opaque') {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned)
          })
        }
        return response
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached
          if (event.request.mode === 'navigate') {
            return caches.match(BASE_PATH + '/')
          }
          return new Response('Offline', { status: 503 })
        }),
      ),
  )
})

// ----- PUSH: handle incoming push notifications -----
self.addEventListener('push', (event) => {
  let data = { title: 'Notificación', body: '', data: {} }

  if (event.data) {
    try {
      data = event.data.json()
    } catch {
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
    self.registration.showNotification(data.title, options),
  )
})

// ----- NOTIFICATIONCLICK: handle notification tap -----
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data
  let url = BASE_PATH + '/'
  if (data?.groupId && data?.exerciseId) {
    url = BASE_PATH + `/groups/${data.groupId}/exercises/${data.exerciseId}`
  } else if (data?.groupId) {
    url = BASE_PATH + `/groups/${data.groupId}`
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(BASE_PATH) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})
