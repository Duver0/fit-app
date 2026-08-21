import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name)

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getRanking(exerciseId: string, page = 1, limit = 20) {
    const cacheKey = `ranking:${exerciseId}:${page}:${limit}`
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.logger.log(`Cache hit for ranking: ${cacheKey}`)
      return JSON.parse(cached)
    }

    const skip = (page - 1) * limit
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } })
    if (!exercise) return { items: [], totalCount: 0, currentPage: page, totalPages: 0 }

    const [items, totalCount] = await Promise.all([
      this.prisma.performanceRecord.findMany({
        where: { exerciseId, deletedAt: null },
        orderBy: { value: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      }),
      this.prisma.performanceRecord.count({ where: { exerciseId, deletedAt: null } }),
    ])

    const ranked = items.map((record, index) => ({
      ...record,
      rank: skip + index + 1,
    }))

    const result = {
      items: ranked,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    }

    await this.redis.set(cacheKey, JSON.stringify(result), 120)

    return result
  }

  /**
   * Obtiene el top 3 de cada ejercicio de un grupo usando una window function.
   * Una sola query con ROW_NUMBER() evita el agrupamiento en memoria.
   */
  async getTop3(groupId: string) {
    const cacheKey = `top3:${groupId}`
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.logger.log(`Cache hit for top3: ${cacheKey}`)
      return JSON.parse(cached)
    }

    // Window function: ROW_NUMBER() OVER (PARTITION BY exerciseId ORDER BY value DESC)
    // Trae solo los 3 mejores registros por ejercicio en una sola query.
    const rawResults = await this.prisma.$queryRaw<
      {
        exercise_id: string
        exercise_name: string
        exercise_description: string | null
        exercise_unit: string
        exercise_group_id: string
        exercise_creator_id: string
        exercise_created_at: Date
        record_id: string
        record_value: number
        record_reps: number | null
        record_weight: number | null
        record_recorded_at: Date
        record_updated_at: Date
        user_id: string
        user_name: string
        user_email: string
        user_avatar_url: string | null
        row_num: bigint
      }[]
    >`
      WITH ranked AS (
        SELECT
          e.id AS exercise_id,
          e.name AS exercise_name,
          e.description AS exercise_description,
          e.unit AS exercise_unit,
          e."groupId" AS exercise_group_id,
          e."creatorId" AS exercise_creator_id,
          e."createdAt" AS exercise_created_at,
          pr.id AS record_id,
          pr.value AS record_value,
          pr.reps AS record_reps,
          pr.weight AS record_weight,
          pr."recordedAt" AS record_recorded_at,
          pr."updatedAt" AS record_updated_at,
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email,
          u."avatarUrl" AS user_avatar_url,
          ROW_NUMBER() OVER (PARTITION BY pr."exerciseId" ORDER BY pr.value DESC) AS row_num
        FROM "PerformanceRecord" pr
        JOIN "Exercise" e ON e.id = pr."exerciseId"
        JOIN "User" u ON u.id = pr."userId"
        WHERE e."groupId" = ${groupId}::text
          AND pr."deletedAt" IS NULL
      )
      SELECT * FROM ranked WHERE row_num <= 3
      ORDER BY exercise_id, row_num
    `

    // Agrupar por ejercicio
    const exercisesMap = new Map<
      string,
      {
        exercise: any
        top: any[]
      }
    >()

    for (const row of rawResults) {
      if (!exercisesMap.has(row.exercise_id)) {
        exercisesMap.set(row.exercise_id, {
          exercise: {
            id: row.exercise_id,
            name: row.exercise_name,
            description: row.exercise_description,
            unit: row.exercise_unit,
            groupId: row.exercise_group_id,
            creatorId: row.exercise_creator_id,
            createdAt: row.exercise_created_at,
          },
          top: [],
        })
      }

      const entry = exercisesMap.get(row.exercise_id)!
      entry.top.push({
        id: row.record_id,
        value: row.record_value,
        reps: row.record_reps,
        weight: row.record_weight,
        recordedAt: row.record_recorded_at,
        updatedAt: row.record_updated_at,
        groupId,
        exerciseId: row.exercise_id,
        userId: row.user_id,
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          avatarUrl: row.user_avatar_url,
        },
        rank: Number(row.row_num),
      })
    }

    const result = Array.from(exercisesMap.values())

    // Cachear con TTL de 120 segundos
    await this.redis.set(cacheKey, JSON.stringify(result), 120)

    return result
  }

  /**
   * Invalida el caché de rankings para un grupo específico.
   * Llamar después de un upsert de performance.
   */
  async invalidateGroupCache(groupId: string): Promise<void> {
    await this.redis.del(`top3:${groupId}`)
    // También invalidar rankings de ejercicios del grupo
    await this.redis.delPattern(`ranking:*`)
    this.logger.log(`Cache invalidated for group: ${groupId}`)
  }
}
