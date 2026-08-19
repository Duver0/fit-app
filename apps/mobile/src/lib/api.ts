const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace('/graphql', '') ||
  'http://localhost:4000'

/**
 * Convierte una URL de imagen a absoluta si es relativa.
 * Útil para imágenes legacy almacenadas con rutas relativas
 * (ej. "/uploads/avatars/file.jpg") que React Native no puede resolver.
 */
export function getImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // Es relativa -> anteponer API_URL
  const base = API_URL.replace(/\/+$/, '')
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}
