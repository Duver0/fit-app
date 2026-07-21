import { Logger } from '@nestjs/common'
import { GroupImage, ImageProvider, ImageSearchOptions } from '../interfaces/image-provider.interface'

interface UnsplashPhoto {
  id: string
  width: number
  height: number
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  user: {
    name: string
    links: {
      html: string
    }
  }
  links: {
    html: string
  }
}

interface UnsplashResponse {
  results: UnsplashPhoto[]
  total: number
  total_pages: number
}

export class UnsplashProvider implements ImageProvider {
  readonly name = 'unsplash'
  private readonly logger = new Logger(UnsplashProvider.name)
  private readonly baseUrl = 'https://api.unsplash.com/search/photos'

  async search(options: ImageSearchOptions): Promise<GroupImage[]> {
    const { query, perPage = 20, page = 1 } = options

    const apiKey = process.env.UNSPLASH_ACCESS_KEY
    if (!apiKey) {
      this.logger.warn('UNSPLASH_ACCESS_KEY is not set')
      return []
    }

    try {
      const url = new URL(this.baseUrl)
      url.searchParams.set('query', query)
      url.searchParams.set('per_page', String(perPage))
      url.searchParams.set('page', String(page))

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
        },
      })

      if (!response.ok) {
        this.logger.error(
          `Unsplash API error: ${response.status} ${response.statusText}`,
        )
        return []
      }

      const data: UnsplashResponse = await response.json()

      return data.results.map((photo) => this.mapToGroupImage(photo))
    } catch (error) {
      this.logger.error(`Unsplash request failed: ${(error as Error).message}`)
      return []
    }
  }

  private mapToGroupImage(photo: UnsplashPhoto): GroupImage {
    return {
      id: photo.id,
      provider: this.name,
      url: `${photo.urls.raw}&fit=max&w=800`,
      thumbnail: `${photo.urls.raw}&fit=max&w=200`,
      author: photo.user.name,
      attributionUrl: photo.links.html,
      width: photo.width,
      height: photo.height,
    }
  }
}
