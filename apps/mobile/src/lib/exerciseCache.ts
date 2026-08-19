import { RANKING_QUERY, MY_PERFORMANCE_QUERY } from './graphql'
import { client } from './apollo'

interface RankingShape {
  items: any[]
  totalCount: number
  currentPage: number
  totalPages: number
}

// Caché efímera en memoria (persiste durante la sesión de la app).
// Evita el "reload" y el skeleton al volver a un ejercicio recién visto.
const rankingCache = new Map<string, { data: RankingShape; at: number }>()
const perfCache = new Map<string, { data: any | null; at: number }>()

const TTL_MS = 5 * 60 * 1000 // 5 minutos

export function cacheRanking(exerciseId: string, ranking: RankingShape) {
  rankingCache.set(exerciseId, { data: ranking, at: Date.now() })
}

export function cachePerformance(exerciseId: string, myPerformance: any | null) {
  perfCache.set(exerciseId, { data: myPerformance, at: Date.now() })
}

// Siembra la caché de Apollo con los datos previos para que el useQuery
// los devuelva de inmediato (loading=false) y no parpadee el skeleton.
export function seedRankingFromCache(exerciseId: string) {
  const entry = rankingCache.get(exerciseId)
  if (!entry || Date.now() - entry.at > TTL_MS) return
  try {
    client.writeQuery({
      query: RANKING_QUERY,
      variables: { exerciseId, page: 1, limit: 100 },
      data: { ranking: entry.data },
    })
  } catch {
    /* noop */
  }
}

export function seedPerformanceFromCache(exerciseId: string) {
  const entry = perfCache.get(exerciseId)
  if (!entry || Date.now() - entry.at > TTL_MS) return
  try {
    client.writeQuery({
      query: MY_PERFORMANCE_QUERY,
      variables: { exerciseId },
      data: { myPerformance: entry.data },
    })
  } catch {
    /* noop */
  }
}
