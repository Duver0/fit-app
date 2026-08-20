import { useCallback } from 'react'
import { router } from 'expo-router'

/**
 * Botón de retroceso tolerante a recargas y deep links.
 *
 * Tras un reload de la página (típico en web/PWA) o al abrir una ruta profunda
 * directamente, el stack de navegación de Expo Router queda vacío y
 * `router.back()` no tiene historial a donde volver, dejando al usuario atrapado
 * en la pantalla actual. Este hook vuelve atrás si existe historial; si no,
 * navega a `fallbackHref` (la ruta padre), restaurando la navegación.
 */
export function useSmartBack(fallbackHref?: string) {
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else if (fallbackHref) {
      // expo-router tipa las rutas con los segmentos de grupo `(app)` como no
      // pertenecientes a `Href`, así que hacemos el cast. En runtime la ruta es
      // válida (el build usa Babel, no typecheck).
      router.replace(fallbackHref as any)
    } else {
      router.back()
    }
  }, [fallbackHref])
}
