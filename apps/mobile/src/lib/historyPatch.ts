/**
 * Patches history.pushState and history.replaceState to respect the <base href> tag.
 *
 * When deploying on a subpath (e.g. GitHub Pages at /fit-app/), the <base href="/fit-app/">
 * tag is set in the HTML but history.pushState() does not use it — it uses the path as-is.
 * This causes client-side navigation to lose the subpath prefix.
 *
 * This module intercepts pushState/replaceState and prepends the base path
 * when the target URL doesn't already include it.
 */

let patched = false

export function patchHistoryForBasePath() {
  if (patched) return
  if (typeof window === 'undefined') return

  const baseEl = document.querySelector('base')
  const baseHref = baseEl?.getAttribute('href')
  if (!baseHref || baseHref === '/') return

  const basePath = baseHref.replace(/\/$/, '') // e.g. "/fit-app"

  const originalPushState = window.history.pushState.bind(window.history)
  const originalReplaceState = window.history.replaceState.bind(window.history)

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
   * una URL limpia (sin el basePath). El <base href> se encarga de la
   * resolución de recursos estáticos, y las navegaciones posteriores
   * recuperan el basePath vía el patch de pushState/replaceState.
   */
  const currentPath = window.location.pathname
  if (currentPath.startsWith(basePath + '/')) {
    const cleanPath = currentPath.slice(basePath.length) || '/'
    originalReplaceState(null, '', cleanPath)
  }

  patched = true
}
