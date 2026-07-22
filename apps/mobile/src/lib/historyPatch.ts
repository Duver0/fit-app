/**
 * Patches history.pushState and history.replaceState to respect the <base href> tag.
 *
 * When deploying on a subpath (e.g. GitHub Pages at /fit-app/), the <base href="/fit-app/">
 * tag is set in the HTML but history.pushState() does not use it — it uses the path as-is.
 * This causes client-side navigation to lose the subpath prefix.
 *
 * This module intercepts pushState/replaceState and prepends the base path
 * when the target URL doesn't already include it.
 *
 * Additionally, handles the GitHub Pages SPA redirect: when a user navigates
 * directly to a deep URL (e.g. /fit-app/groups/xxx), GitHub Pages serves 404.html
 * which redirects to /fit-app/?redirect=/groups/xxx. This module reads the redirect
 * parameter and sets the clean path as the initial URL so Expo Router can route correctly.
 */

let patched = false

function getCleanPath(basePath: string): string {
  const currentPath = window.location.pathname
  if (currentPath.startsWith(basePath + '/')) {
    return currentPath.slice(basePath.length) || '/'
  }
  return currentPath
}

export function patchHistoryForBasePath() {
  if (patched) return
  if (typeof window === 'undefined') return

  const baseEl = document.querySelector('base')
  const baseHref = baseEl?.getAttribute('href')
  if (!baseHref || baseHref === '/') return

  const basePath = baseHref.replace(/\/$/, '') // e.g. "/fit-app"
  const originalReplaceState = window.history.replaceState.bind(window.history)

  // --- Handle redirect from 404.html ---
  // When the user lands via ?redirect=/groups/xxx, replace the URL
  // with the intended path so Expo Router picks it up.
  const params = new URLSearchParams(window.location.search)
  const redirectPath = params.get('redirect')
  if (redirectPath) {
    const cleanRedirect = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`
    const fullUrl = `${basePath}${cleanRedirect}`
    originalReplaceState(null, '', fullUrl)
  }

  // Patch pushState/replaceState to prepend the base path
  const originalPushState = window.history.pushState.bind(window.history)

  window.history.pushState = function (state: any, title: string, url?: string | URL | null) {
    if (url && typeof url === 'string' && url.startsWith('/') && !url.startsWith(basePath)) {
      url = `${basePath}${url}`
    }
    return originalPushState(state, title, url)
  } as typeof window.history.pushState

  window.history.replaceState = function (state: any, title: string, url?: string | URL | null) {
    if (url && typeof url === 'string' && url.startsWith('/') && !url.startsWith(basePath)) {
      url = `${basePath}${url}`
    }
    return originalReplaceState(state, title, url)
  } as typeof window.history.replaceState

  /**
   * Fix initial navigation: expo-router lee window.location.pathname para
   * determinar la ruta inicial, pero si el pathname incluye el basePath
   * (ej: /fit-app/groups/...), no encuentra rutas que coincidan y termina
   * en el index. Reemplazamos el estado inicial para que expo-router vea
   * una URL limpia (sin el basePath).
   *
   * Nota: read after the redirect handling above, since replaceState
   * updates location.pathname synchronously.
   */
  const cleanPath = getCleanPath(basePath)
  if (cleanPath !== window.location.pathname) {
    originalReplaceState(null, '', cleanPath)
  }

  patched = true
}
