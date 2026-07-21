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
    const result = await searchImagesQuery({ variables: { query: query.trim(), limit } })
    if (result.error) {
      throw new Error(result.error.message)
    }
    return result.data?.searchGroupImages || []
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
