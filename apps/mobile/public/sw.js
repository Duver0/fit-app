/**
 * Fit App — Service Worker
 *
 * Provides offline fallback and PWA installability.
 * Deployed alongside the SPA at /fit-app/sw.js on GitHub Pages.
 *
 * The BASE_PATH is computed dynamically from the script's own location,
 * so it works on both root (/) and subpath (/fit-app/) deployments.
 */
const CACHE_NAME = 'fit-app-v1'
const BASE_PATH = self.location.pathname.replace('/sw.js', '')

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for page refresh
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of all pages under this scope immediately
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Network-first strategy:
  // 1. Try the network request
  // 2. If it fails (offline), serve from cache as fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Optionally cache successful responses for future offline use
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cloned)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      }),
  )
})
