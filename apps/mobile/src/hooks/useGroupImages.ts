import { useLazyQuery } from '@apollo/client'
import { GROUP_IMAGES_QUERY, SEARCH_GROUP_AVATAR_QUERY } from '../lib/graphql'

export interface GroupImage {
  id: string
  provider: string
  url: string
  thumbnail: string
  author: string
  attributionUrl: string
  width?: number
  height?: number
}

/**
 * Hook para obtener imágenes dinámicas de una categoría muscular.
 * Ej: getImagesForCategory('Chest') -> imágenes de pecho desde Unsplash/Pexels/Pixabay
 */
export function useGroupImages() {
  const [fetchImages, { data, loading, error }] = useLazyQuery(GROUP_IMAGES_QUERY)
  const [searchImagesQuery, { loading: searchLoading }] = useLazyQuery(SEARCH_GROUP_AVATAR_QUERY)

  const getImagesForCategory = async (category: string, limit = 4): Promise<GroupImage[]> => {
    const result = await fetchImages({ variables: { category, limit } })
    return result.data?.groupImages || []
  }

  const getDefaultImages = async (limit = 4): Promise<GroupImage[]> => {
    return getImagesForCategory('Default', limit)
  }

  /**
   * Busca imágenes de stock por texto en todos los proveedores.
   * Ej: searchImages('running') -> fotos de running desde Unsplash/Pexels/Pixabay
   */
  const searchImages = async (query: string, limit = 8): Promise<GroupImage[]> => {
    if (!query.trim()) return []
    console.log('[useGroupImages] searchImages query=', query, 'limit=', limit)
    const result = await searchImagesQuery({ variables: { query: query.trim(), limit } })
    console.log('[useGroupImages] searchImages raw result:', JSON.stringify({
      data: result.data,
      error: result.error ? { message: result.error.message, graphQLErrors: result.error.graphQLErrors } : null,
      loading: result.loading,
    }))
    if (result.error) {
      console.warn('[useGroupImages] searchImages GraphQL error:', result.error.message, result.error.graphQLErrors)
      throw new Error(result.error.message)
    }
    const images = result.data?.searchGroupImages || []
    console.log('[useGroupImages] searchImages returning', images.length, 'images')
    return images
  }

  return {
    images: (data?.groupImages as GroupImage[]) || [],
    loading,
    error,
    getImagesForCategory,
    getDefaultImages,
    searchImages,
    searchLoading,
  }
}
