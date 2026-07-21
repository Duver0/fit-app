import { Logger } from '@nestjs/common'
import { GroupImage, ImageProvider, ImageSearchOptions } from '../interfaces/image-provider.interface'

interface PixabayImage {
  id: number
  pageURL: string
  type: string
  tags: string
  previewURL: string
  previewWidth: number
  previewHeight: number
  webformatURL: string
  webformatWidth: number
  webformatHeight: number
  largeImageURL: string
  fullHDURL: string
  imageURL: string
  imageWidth: number
  imageHeight: number
  imageSize: number
  views: number
  downloads: number
  likes: number
  comments: number
  user_id: number
  user: string
  userImageURL: string
}

interface PixabayResponse {
  total: number
  totalHits: number
  hits: PixabayImage[]
}

export class PixabayProvider implements ImageProvider {
  readonly name = 'pixabay'
  private readonly logger = new Logger(PixabayProvider.name)
  private readonly baseUrl = 'https://pixabay.com/api/'

  async search(options: ImageSearchOptions): Promise<GroupImage[]> {
    const { query, perPage = 20, page = 1 } = options

    const apiKey = process.env.PIXABAY_API_KEY
    if (!apiKey) {
      this.logger.warn('PIXABAY_API_KEY is not set')
      return []
    }

    try {
      const url = new URL(this.baseUrl)
      url.searchParams.set('key', apiKey)
      url.searchParams.set('q', query)
      url.searchParams.set('per_page', String(perPage))
      url.searchParams.set('page', String(page))
      url.searchParams.set('safesearch', 'true')

      const response = await fetch(url.toString())

      if (!response.ok) {
        this.logger.error(
          `Pixabay API error: ${response.status} ${response.statusText}`,
        )
        return []
      }

      const data: PixabayResponse = await response.json()

      return data.hits.map((image) => this.mapToGroupImage(image))
    } catch (error) {
      this.logger.error(`Pixabay request failed: ${(error as Error).message}`)
      return []
    }
  }

  private mapToGroupImage(image: PixabayImage): GroupImage {
    return {
      id: String(image.id),
      provider: this.name,
      url: image.webformatURL,
      thumbnail: image.previewURL,
      author: image.user,
      attributionUrl: image.pageURL,
      width: image.webformatWidth,
      height: image.webformatHeight,
    }
  }
}
