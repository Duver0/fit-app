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
 * NOTA: La limpieza inicial del pathname (remover el basePath) se hace en un
 * script inline en el HTML que se ejecuta ANTES de que cargue el bundle principal.
 * Esto asegura que Expo Router vea la URL limpia desde el inicio.
 * Ver: deploy-frontend.yml step 4a (inyección de script inline).
 */

let patched = false

export function patchHistoryForBasePath() {
  if (patched) return
  if (typeof window === 'undefined') return

  const baseEl = document.querySelector('base')
  const baseHref = baseEl?.getAttribute('href')
  if (!baseHref || baseHref === '/') return

  const basePath = baseHref.replace(/\/$/, '') // e.g. "/fit-app"

  // Patch pushState/replaceState to prepend the base path
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

  patched = true
}
