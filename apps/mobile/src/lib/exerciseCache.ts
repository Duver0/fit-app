import { RANKING_QUERY, MY_PERFORMANCE_QUERY, GROUP_QUERY } from './graphql'
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

// Tamaño de lote: limita la concurrencia para no saturar el backend serverless.
// Un burst de ~50 ejercicios x 2 queries en paralelo hace que Vercel encole/rechace
// peticiones y deje el cache frio -> skeleton aunque entres "lento". Por lotes de 6
// se completa de forma fiable y ademas siembra el Map en memoria (doble cobertura).
const PREFETCH_CHUNK = 6

async function prefetchOne(exerciseId: string) {
  const [r, p] = await Promise.all([
    client.query({
      query: RANKING_QUERY,
      variables: { exerciseId, page: 1, limit: 100 },
      fetchPolicy: 'cache-first',
    }),
    client.query({
      query: MY_PERFORMANCE_QUERY,
      variables: { exerciseId },
      fetchPolicy: 'cache-first',
    }),
  ])
  if (r.data?.ranking) cacheRanking(exerciseId, r.data.ranking)
  if (p.data) cachePerformance(exerciseId, p.data.myPerformance ?? null)
}

// Precarga ranking + mi performance (y el grupo) para que al entrar al detalle
// del ejercicio se pinte al instante. Fire-and-forget: se llama desde un effect.
export async function prefetchExerciseData(exercises: any[], groupId?: string) {
  if (!exercises?.length) return
  if (groupId) {
    client
      .query({ query: GROUP_QUERY, variables: { id: groupId }, fetchPolicy: 'cache-first' })
      .catch(() => {})
  }
  const ids = exercises
    .map((e) => e?.id)
    .filter((id): id is string => typeof id === 'string')
    .slice(0, 50)
  for (let i = 0; i < ids.length; i += PREFETCH_CHUNK) {
    const chunk = ids.slice(i, i + PREFETCH_CHUNK)
    await Promise.all(
      chunk.map((id) =>
        prefetchOne(id).catch((err) => {
          if (__DEV__) console.warn('[prefetch] fallo para', id, err?.message ?? err)
        }),
      ),
    )
  }
}
