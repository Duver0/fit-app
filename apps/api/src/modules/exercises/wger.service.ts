import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisService } from '../../redis/redis.service'
import { WgerExercise, WgerSearchResult } from '../../common/models/wger.model'

// Language ID for English in wger
const LANG_ENGLISH = 2
const LANG_SPANISH = 4

// Cache TTL in seconds (30 minutes)
const CACHE_TTL_S = 30 * 60

interface WgerImageRaw {
  image: string
  thumbnails?: {
    small?: string
    medium?: string
  }
}

interface WgerTranslationRaw {
  id: number
  language: number
  name: string
  description: string
}

interface WgerExerciseRaw {
  id: number
  name?: string
  category?: { id: number; name: string }
  muscles?: { id: number; name_en: string }[]
  muscles_secondary?: { id: number; name_en: string }[]
  equipment?: { id: number; name: string }[]
  images?: WgerImageRaw[]
  translations?: WgerTranslationRaw[]
  description?: string
}

interface WgerRawResponse {
  count: number
  next: string | null
  previous: string | null
  results: WgerExerciseRaw[]
}

@Injectable()
export class WgerService {
  private readonly logger = new Logger(WgerService.name)
  private readonly baseUrl: string

  constructor(
    private config: ConfigService,
    private redis: RedisService,
  ) {
    this.baseUrl = this.config.get(
      'WGER_API_URL',
      'https://wger.de/api/v2',
    )
  }

  /**
   * Genera una clave de caché para búsquedas.
   */
  private searchCacheKey(name: string, limit: number, offset: number): string {
    return `wger:search:${name.toLowerCase().trim()}:${limit}:${offset}`
  }

  /**
   * Genera una clave de caché para búsqueda por ID.
   */
  private idCacheKey(id: number): string {
    return `wger:id:${id}`
  }

  /**
   * Busca ejercicios en wger filtrando SOLO por nombre y con imagen.
   * - Solo devuelve ejercicios cuyo nombre contenga el texto buscado
   * - Solo devuelve ejercicios que tengan al menos una imagen disponible
   */
  async searchByName(
    name: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<WgerSearchResult> {
    // Revisar caché en Redis
    const cacheKey = this.searchCacheKey(name, limit, offset)
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.logger.log(`Cache hit for wger search: "${name}" (limit=${limit}, offset=${offset})`)
      return JSON.parse(cached)
    }

    this.logger.log(`Cache miss for wger search: "${name}" — fetching from API`)

    // Pedimos un batch grande porque filtraremos muchos resultados
    const fetchLimit = 100
    const url = `${this.baseUrl}/exerciseinfo/?format=json&limit=${fetchLimit}&offset=${offset}&search=${encodeURIComponent(name)}`
    this.logger.log(`Searching wger: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      this.logger.error(`wger API error: ${response.status} ${response.statusText}`)
      throw new Error(`Error al buscar ejercicios en wger (${response.status})`)
    }

    const result: WgerRawResponse = await response.json()

    const searchLower = name.toLowerCase()

    // Mapear y filtrar: solo los que tienen el término en el nombre Y tienen imagen
    const items: WgerExercise[] = result.results
      .filter((raw) => {
        // Solo ejercicios con al menos una imagen
        if (!raw.images || raw.images.length === 0) return false

        // Extraer nombre para ver si coincide
        const translation =
          raw.translations?.find((t) => t.language === LANG_ENGLISH) ||
          raw.translations?.find((t) => t.language === LANG_SPANISH) ||
          raw.translations?.[0]
        const exerciseName = translation?.name?.toLowerCase() || raw.name?.toLowerCase() || ''

        // Solo si el nombre contiene el término buscado
        return exerciseName.includes(searchLower)
      })
      .map((item) => this.mapExercise(item))
      .slice(0, limit)

    const nextOffset = result.next ? offset + fetchLimit : undefined

    const data: WgerSearchResult = {
      items,
      total: result.count,
      nextOffset,
      hasNextPage: result.next !== null,
    }

    // Guardar en caché Redis con TTL de 30 minutos
    await this.redis.set(cacheKey, JSON.stringify(data), CACHE_TTL_S)

    return data
  }

  /**
   * Obtiene un ejercicio específico por su ID en wger.
   * Cachea el resultado por ID (los datos de un ejercicio no cambian frecuentemente).
   */
  async findById(id: number): Promise<WgerExercise | null> {
    const cacheKey = this.idCacheKey(id)
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.logger.log(`Cache hit for wger exercise #${id}`)
      return JSON.parse(cached)
    }

    this.logger.log(`Cache miss for wger exercise #${id} — fetching from API`)

    const url = `${this.baseUrl}/exerciseinfo/${id}/?format=json`
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 404) return null
      this.logger.error(`wger API error: ${response.status} ${response.statusText}`)
      throw new Error(`Error al obtener ejercicio de wger (${response.status})`)
    }

    const item: WgerExerciseRaw = await response.json()
    const exercise = this.mapExercise(item)

    // Guardar en caché Redis con TTL de 30 minutos
    await this.redis.set(cacheKey, JSON.stringify(exercise), CACHE_TTL_S)

    return exercise
  }

  private mapExercise(item: WgerExerciseRaw): WgerExercise {
    // Buscar traducción en inglés o español
    const translation =
      item.translations?.find((t) => t.language === LANG_ENGLISH) ||
      item.translations?.find((t) => t.language === LANG_SPANISH) ||
      item.translations?.[0]

    const name = translation?.name || item.name || `Exercise #${item.id}`

    // Limpiar HTML de la descripción
    const description = translation?.description
      ? translation.description.replace(/<[^>]*>/g, '').trim()
      : undefined

    // Obtener la imagen principal
    const mainImage = item.images?.find(() => true) // first image
    const image = mainImage?.image
    const thumbnail = mainImage?.thumbnails?.medium

    // Juntar músculos primarios y secundarios
    const muscles = [
      ...(item.muscles?.map((m) => m.name_en).filter(Boolean) ?? []),
      ...(item.muscles_secondary?.map((m) => m.name_en).filter(Boolean) ?? []),
    ]

    return {
      id: item.id,
      name,
      category: item.category?.name,
      image,
      thumbnail,
      muscles: muscles.length > 0 ? muscles : undefined,
      equipment: item.equipment?.map((e) => e.name) ?? undefined,
      description,
    }
  }
}
