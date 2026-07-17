/**
 * Registers the service worker for PWA support.
 *
 * The service worker script is served from the same base path as the app,
 * so it works on both root (/) and subpath (/fit-app/) deployments.
 *
 * Call this once from the root layout's useEffect to ensure
 * the service worker is registered after the page loads.
 *
 * @param onUpdate - Optional callback fired when a new SW version is waiting.
 *                   Call `registration.waiting.postMessage({ type: 'SKIP_WAITING' })`
 *                   to activate it, then reload the page.
 */
export function registerServiceWorker(onUpdate?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Derive the base URL from the current pathname.
  // On GitHub Pages with subpath /fit-app/, the SW will be at /fit-app/sw.js.
  // On root deployments, it will be at /sw.js.
  const baseUrl = window.location.pathname.replace(/\/$/, '')
  const swUrl = `${baseUrl}/sw.js`

  // Use the same base URL as the scope so the SW controls all pages under it.
  const scope = `${baseUrl}/`

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl, { scope })
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope)

        // Check if there's a waiting worker (update available)
        if (registration.waiting) {
          console.log('[PWA] New SW version waiting')
          onUpdate?.()
        }

        // Listen for new SW installations
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New version available
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

    // Listen for controller change (new SW activated) and reload
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
