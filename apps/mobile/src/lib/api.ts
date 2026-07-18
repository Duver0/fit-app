import { Platform } from 'react-native'
import { useAuthStore } from '../stores/authStore'

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

// ---------------------------------------------------------------------------
// Helper: en React Native FormData acepta { uri, name, type } como "blob".
// En web necesita un File/Blob real.
// ---------------------------------------------------------------------------
async function appendFileToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  fileName: string,
  fileType: string,
) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri)
    if (!response.ok) {
      throw new Error(`No se pudo leer la imagen temporal (${response.status})`)
    }
    const blob = await response.blob()
    const file = new File([blob], fileName, { type: fileType })
    formData.append(fieldName, file)
  } else {
    formData.append(fieldName, { uri, name: fileName, type: fileType } as any)
  }
}

// ---------------------------------------------------------------------------
// Upload helpers — comparten la misma lógica de fetch
// ---------------------------------------------------------------------------
async function uploadFile(
  uri: string,
  endpoint: string,
  defaultName: string,
): Promise<Record<string, string>> {
  const token = useAuthStore.getState().token
  if (!token) throw new Error('No authentication token available')

  // Detectar extensión desde el nombre original del archivo en la URI.
  // Las blob URLs (web) no llevan extensión, así que usamos el defaultName.
  const filename = uri.split('/').pop() || ''
  const ext = filename.includes('.')
    ? (filename.split('.').pop() || 'jpg').toLowerCase()
    : defaultName.split('.').pop() || 'jpg'
  const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
  const safeName = defaultName.replace(/\..*$/, '') + '.' + ext

  const formData = new FormData()
  await appendFileToFormData(formData, 'file', uri, safeName, mimeType)

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 413) {
      throw new Error('La imagen es demasiado grande. El máximo es 5MB.')
    }
    throw new Error(errorBody || 'Error al subir la imagen')
  }

  return response.json() as Promise<Record<string, string>>
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export async function uploadAvatar(uri: string): Promise<string> {
  const data = await uploadFile(uri, '/upload/avatar', 'avatar.jpg')
  return data.avatarUrl
}

export async function uploadGroupAvatar(uri: string): Promise<string> {
  const data = await uploadFile(uri, '/upload/group', 'group-avatar.jpg')
  return data.avatarUrl
}

export async function uploadExerciseImage(uri: string): Promise<string> {
  const data = await uploadFile(uri, '/upload/exercise', 'exercise.jpg')
  return data.imageUrl
}
