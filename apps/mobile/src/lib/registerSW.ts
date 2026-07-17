/**
 * Registers the service worker for PWA support.
 *
 * The service worker script is served from the same base path as the app,
 * so it works on both root (/) and subpath (/fit-app/) deployments.
 *
 * Call this once from the root layout's useEffect to ensure
 * the service worker is registered after the page loads.
 */
export function registerServiceWorker(): void {
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
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err)
      })
  })
}
