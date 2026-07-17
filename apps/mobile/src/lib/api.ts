import { useAuthStore } from '../stores/authStore'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace('/graphql', '') ||
  'http://localhost:4000'

export async function uploadAvatar(uri: string): Promise<string> {
  const token = useAuthStore.getState().token

  if (!token) {
    throw new Error('No authentication token available')
  }

  const formData = new FormData()

  // Extract filename and extension from the URI
  const filename = uri.split('/').pop() || 'avatar.jpg'
  const ext = filename.split('.').pop() || 'jpg'

  // Append the file in React Native's expected format
  formData.append('file', {
    uri,
    name: `avatar.${ext}`,
    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  } as any)

  const response = await fetch(`${API_URL}/upload/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — fetch will set it automatically with the
      // correct multipart boundary when FormData is used.
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 413) {
      throw new Error('La imagen es demasiado grande. El máximo es 20MB.')
    }
    throw new Error(errorBody || 'Error al subir la imagen')
  }

  const data = await response.json()
  return data.avatarUrl
}

export async function uploadGroupAvatar(uri: string): Promise<string> {
  const token = useAuthStore.getState().token

  if (!token) {
    throw new Error('No authentication token available')
  }

  const formData = new FormData()

  const filename = uri.split('/').pop() || 'group-avatar.jpg'
  const ext = filename.split('.').pop() || 'jpg'

  formData.append('file', {
    uri,
    name: `group-avatar.${ext}`,
    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  } as any)

  const response = await fetch(`${API_URL}/upload/group`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 413) {
      throw new Error('La imagen es demasiado grande. El máximo es 20MB.')
    }
    throw new Error(errorBody || 'Error al subir la imagen')
  }

  const data = await response.json()
  return data.avatarUrl
}
