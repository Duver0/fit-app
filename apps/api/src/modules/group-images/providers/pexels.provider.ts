import { Logger } from '@nestjs/common'
import { GroupImage, ImageProvider, ImageSearchOptions } from '../interfaces/image-provider.interface'

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    tiny: string
    portrait: string
    landscape: string
  }
  liked: boolean
  alt: string
}

interface PexelsResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page: string
  prev_page: string
}

export class PexelsProvider implements ImageProvider {
  readonly name = 'pexels'
  private readonly logger = new Logger(PexelsProvider.name)
  private readonly baseUrl = 'https://api.pexels.com/v1/search'

  async search(options: ImageSearchOptions): Promise<GroupImage[]> {
    const { query, perPage = 20, page = 1 } = options

    const apiKey = process.env.PEXELS_API_KEY
    if (!apiKey) {
      this.logger.warn('PEXELS_API_KEY is not set')
      return []
    }

    try {
      const url = new URL(this.baseUrl)
      url.searchParams.set('query', query)
      url.searchParams.set('per_page', String(perPage))
      url.searchParams.set('page', String(page))

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: apiKey,
        },
      })

      if (!response.ok) {
        this.logger.error(
          `Pexels API error: ${response.status} ${response.statusText}`,
        )
        return []
      }

      const data: PexelsResponse = await response.json()

      return data.photos.map((photo) => this.mapToGroupImage(photo))
    } catch (error) {
      this.logger.error(`Pexels request failed: ${(error as Error).message}`)
      return []
    }
  }

  private mapToGroupImage(photo: PexelsPhoto): GroupImage {
    return {
      id: String(photo.id),
      provider: this.name,
      url: photo.src.medium,
      thumbnail: photo.src.tiny,
      author: photo.photographer,
      attributionUrl: photo.photographer_url,
      width: photo.width,
      height: photo.height,
    }
  }
}
