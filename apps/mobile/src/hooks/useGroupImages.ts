import { useLazyQuery } from '@apollo/client'
import { GROUP_IMAGES_QUERY } from '../lib/graphql'

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

  const getImagesForCategory = async (category: string, limit = 4): Promise<GroupImage[]> => {
    const result = await fetchImages({ variables: { category, limit } })
    return result.data?.groupImages || []
  }

  const getDefaultImages = async (limit = 4): Promise<GroupImage[]> => {
    return getImagesForCategory('Default', limit)
  }

  return {
    images: (data?.groupImages as GroupImage[]) || [],
    loading,
    error,
    getImagesForCategory,
    getDefaultImages,
  }
}
