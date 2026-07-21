import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { ImageProvider, GroupImage, ImageSearchOptions } from './interfaces/image-provider.interface'
import { ProviderDiagResult } from '../../common/models'
import { UnsplashProvider } from './providers/unsplash.provider'
import { PexelsProvider } from './providers/pexels.provider'
import { PixabayProvider } from './providers/pixabay.provider'
import { getSearchTerms } from './search-terms'

@Injectable()
export class GroupImageService {
  private readonly logger = new Logger(GroupImageService.name)
  private providers: ImageProvider[] = []
  private readonly ttlMs: number
  private readonly maxPerCategory: number

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.ttlMs = (this.configService.get<number>('GROUP_IMAGE_CACHE_TTL_DAYS', 7)) * 24 * 60 * 60 * 1000
    this.maxPerCategory = this.configService.get<number>('GROUP_IMAGE_MAX_PER_CATEGORY', 6)

    this.initProviders()
  }

  private initProviders() {
    const providers: { Provider: new (...args: any[]) => ImageProvider; envKey: string; name: string }[] = [
      { Provider: UnsplashProvider as any, envKey: 'UNSPLASH_ACCESS_KEY', name: 'unsplash' },
      { Provider: PexelsProvider as any, envKey: 'PEXELS_API_KEY', name: 'pexels' },
      { Provider: PixabayProvider as any, envKey: 'PIXABAY_API_KEY', name: 'pixabay' },
    ]

    for (const { Provider, envKey, name } of providers) {
      // Intentar con ConfigService primero, fallback a process.env directo
      // (útil para entornos Docker donde la env var está en el proceso pero
      // ConfigService puede no encontrarla por diferencia de cwd)
      const key = this.configService.get<string>(envKey) || process.env[envKey]
      if (key) {
        try {
          const instance = new (Provider as any)()
          this.providers.push(instance)
          this.logger.log(`Provider "${name}" initialized`)
        } catch (e) {
          this.logger.warn(`Provider "${name}" failed to initialize: ${(e as Error).message}`)
        }
      } else {
        this.logger.warn(`Provider "${name}" skipped — missing ${envKey} env var`)
      }
    }

    if (this.providers.length === 0) {
      this.logger.warn('No image providers configured. Images will not be available.')
    }
  }

  /**
   * Obtiene imágenes para una categoría de grupo muscular.
   * 1. Busca en caché primero
   * 2. Si no hay caché válida, consulta APIs externas
   * 3. Guarda resultados en caché
   * 4. Retorna imágenes únicas (sin duplicados por URL)
   */
  async getImagesForCategory(category: string): Promise<GroupImage[]> {
    // 1. Intentar desde caché
    const cached = await this.getCachedImages(category)
    if (cached.length > 0) {
      this.logger.debug(`Cache hit for category "${category}": ${cached.length} images`)
      return cached
    }

    this.logger.log(`Cache miss for category "${category}". Fetching from providers...`)

    // 2. Obtener términos de búsqueda
    const terms = getSearchTerms(category)
    if (terms.length === 0) {
      this.logger.warn(`No search terms for category "${category}"`)
      return []
    }

    // 3. Consultar APIs externas con fallback
    const allImages = await this.fetchFromProviders(terms, category)

    // 4. Guardar en caché
    if (allImages.length > 0) {
      await this.cacheImages(category, terms[0], allImages)
    }

    return allImages
  }

  /**
   * Consulta proveedores con fallback.
   * Prueba cada proveedor en orden; si uno falla, pasa al siguiente.
   */
  private async fetchFromProviders(terms: string[], category: string): Promise<GroupImage[]> {
    const allImages: Map<string, GroupImage> = new Map()

    for (const provider of this.providers) {
      if (allImages.size >= this.maxPerCategory) break

      const imagesPerTerm = Math.max(1, Math.ceil((this.maxPerCategory - allImages.size) / terms.length))

      for (const term of terms) {
        if (allImages.size >= this.maxPerCategory) break

        try {
          const options: ImageSearchOptions = {
            query: term,
            perPage: Math.min(imagesPerTerm, 10),
            page: 1,
          }

          const results = await this.retryWithBackoff(() => provider.search(options), 2)

          for (const img of results) {
            if (allImages.size >= this.maxPerCategory) break
            if (!allImages.has(img.id)) {
              allImages.set(img.id, img)
            }
          }
        } catch (error) {
          this.logger.warn(`Provider "${provider.name}" failed for term "${term}": ${(error as Error).message}`)
        }
      }
    }

    if (allImages.size === 0) {
      this.logger.warn(`No images found for category "${category}" from any provider`)
    }

    return Array.from(allImages.values())
  }

  /**
   * Busca imágenes por query textual en todos los proveedores.
   * Útil para avatares de grupo: el usuario escribe un término (ej: 'running', 'yoga')
   * y se obtienen fotos de stock de Unsplash/Pexels/Pixabay.
   * A diferencia de getImagesForCategory, NO cachea los resultados.
   */
  /**
   * Retorna los nombres de los proveedores que se inicializaron correctamente.
   * Útil para diagnóstico en producción.
   */
  getActiveProviders(): string[] {
    return this.providers.map(p => p.name)
  }

  async searchImages(query: string, limit: number = 8): Promise<GroupImage[]> {
    if (!query.trim()) return []
    if (this.providers.length === 0) {
      this.logger.warn(`searchImages("${query}") — no providers initialized`)
      return []
    }

    const allImages: Map<string, GroupImage> = new Map()
    const perProvider = Math.max(1, Math.ceil(limit / this.providers.length))

    for (const provider of this.providers) {
      if (allImages.size >= limit) break

      try {
        const options: ImageSearchOptions = {
          query: query.trim(),
          perPage: perProvider,
          page: 1,
        }

        const results = await this.retryWithBackoff(() => provider.search(options), 2)

        for (const img of results) {
          if (allImages.size >= limit) break
          if (!allImages.has(img.id)) {
            allImages.set(img.id, img)
          }
        }
      } catch (error) {
        this.logger.warn(`Provider "${provider.name}" search failed: ${(error as Error).message}`)
      }
    }

    return Array.from(allImages.values())
  }

  /**
   * Prueba cada proveedor individualmente y devuelve diagnóstico.
   * Útil para debugging desde el cliente.
   */
  async diagnoseProviders(query: string): Promise<ProviderDiagResult[]> {
    const results: ProviderDiagResult[] = []
    const rawProviders: { name: string; envKey: string }[] = [
      { name: 'unsplash', envKey: 'UNSPLASH_ACCESS_KEY' },
      { name: 'pexels', envKey: 'PEXELS_API_KEY' },
      { name: 'pixabay', envKey: 'PIXABAY_API_KEY' },
    ]

    for (const { name, envKey } of rawProviders) {
      const configured = !!(this.configService.get<string>(envKey) || process.env[envKey])
      const diag: ProviderDiagResult = {
        provider: name,
        configured,
        success: false,
        count: 0,
      }

      if (!configured) {
        results.push(diag)
        continue
      }

      // Buscar el provider activo si está inicializado
      const provider = this.providers.find(p => p.name === name)

      if (!provider) {
        diag.error = 'Provider class not initialized (failed to instantiate)'
        results.push(diag)
        continue
      }

      try {
        const imgs = await provider.search({ query, perPage: 3, page: 1 })
        diag.success = imgs.length > 0
        diag.count = imgs.length
        if (imgs.length > 0) {
          diag.firstImageThumbnail = imgs[0].thumbnail
        }
      } catch (e: any) {
        diag.error = e.message
      }

      results.push(diag)
    }

    return results
  }

  /**
   * Reintentos con backoff exponencial.
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        if (attempt === maxRetries) throw error
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        this.logger.debug(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new Error('Max retries exceeded')
  }

  // ---------------------------------------------------------------------------
  // Cache
  // ---------------------------------------------------------------------------

  private async getCachedImages(category: string): Promise<GroupImage[]> {
    try {
      const rows = await this.prisma.groupImageCache.findMany({
        where: {
          category,
          expiresAt: { gt: new Date() },
        },
        orderBy: { downloadedAt: 'desc' },
        take: this.maxPerCategory,
      })

      return rows.map(row => ({
        id: row.imageId,
        provider: row.provider,
        url: row.imageUrl,
        thumbnail: row.thumbnailUrl,
        author: row.author,
        attributionUrl: row.attributionUrl,
        width: row.width,
        height: row.height,
      }))
    } catch (error) {
      this.logger.error(`Cache read error for category "${category}": ${(error as Error).message}`)
      return []
    }
  }

  private async cacheImages(category: string, searchTerm: string, images: GroupImage[]): Promise<void> {
    const expiresAt = new Date(Date.now() + this.ttlMs)

    const data = images.map(img => ({
      category,
      searchTerm,
      provider: img.provider,
      imageUrl: img.url,
      thumbnailUrl: img.thumbnail,
      author: img.author,
      attributionUrl: img.attributionUrl,
      imageId: img.id,
      width: img.width || 0,
      height: img.height || 0,
      downloadedAt: new Date(),
      expiresAt,
    }))

    try {
      // Limpiar caché antigua para esta categoría
      await this.prisma.groupImageCache.deleteMany({ where: { category } })

      // Insertar nuevos
      if (data.length > 0) {
        await this.prisma.groupImageCache.createMany({ data })
      }

      this.logger.log(`Cached ${images.length} images for category "${category}" (expires ${expiresAt.toISOString()})`)
    } catch (error) {
      this.logger.error(`Cache write error for category "${category}": ${(error as Error).message}`)
    }
  }

  /**
   * Limpia caché expirada. Útil para un cron job.
   */
  async cleanExpiredCache(): Promise<number> {
    const result = await this.prisma.groupImageCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    this.logger.log(`Cleaned ${result.count} expired cache entries`)
    return result.count
  }

  /**
   * Fuerza la renovación del caché para una categoría.
   */
  async refreshCache(category: string): Promise<GroupImage[]> {
    await this.prisma.groupImageCache.deleteMany({ where: { category } })
    return this.getImagesForCategory(category)
  }
}
