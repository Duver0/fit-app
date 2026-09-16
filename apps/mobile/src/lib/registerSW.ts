/**
 * Registers the service worker for PWA support.
 *
 * The service worker lives at /fit-app/sw.js (same as the baseUrl).
 * Scope is /fit-app/ so it controls all app pages.
 *
 * Call this once from the root layout's useEffect.
 *
 * @param onUpdate - Callback fired when a new SW version is waiting.
 */
export function registerServiceWorker(onUpdate?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Hardcoded to match experiments.baseUrl in app.json
  const swUrl = '/fit-app/sw.js'
  const scope = '/fit-app/'

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl, { scope })
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope)

        if (registration.waiting) {
          console.log('[PWA] New SW version waiting')
          onUpdate?.()
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[PWA] New SW version downloaded')
                onUpdate?.()
              } else {
                console.log('[PWA] SW installed for first time')
              }
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err)
      })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        console.log('[PWA] New SW activated, reloading...')
        window.location.reload()
      }
    })
  })
}
