import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RankingService {
  constructor(private prisma: PrismaService) {}

  async getRanking(exerciseId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } })
    if (!exercise) return { items: [], totalCount: 0, currentPage: page, totalPages: 0 }

    const [items, totalCount] = await Promise.all([
      this.prisma.performanceRecord.findMany({
        where: { exerciseId },
        orderBy: { value: 'desc' },
        skip,
        take: limit,
        include: { user: true },
      }),
      this.prisma.performanceRecord.count({ where: { exerciseId } }),
    ])

    const ranked = items.map((record, index) => ({
      ...record,
      rank: skip + index + 1,
    }))

    return {
      items: ranked,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    }
  }

  // Evita el N+1: una sola query trae todos los registros del grupo y se
  // agrupan en memoria para quedarse con el top 3 de cada ejercicio.
  async getTop3(groupId: string) {
    const exercises = await this.prisma.exercise.findMany({
      where: { groupId },
      include: { creator: true },
    })
    if (exercises.length === 0) return []

    const exerciseIds = exercises.map((e) => e.id)
    const records = await this.prisma.performanceRecord.findMany({
      where: { exerciseId: { in: exerciseIds } },
      orderBy: { value: 'desc' },
      include: { user: true },
    })

    const byExercise = new Map<string, any[]>()
    for (const record of records) {
      const list = byExercise.get(record.exerciseId)
      if (list) list.push(record)
      else byExercise.set(record.exerciseId, [record])
    }

    return exercises.map((exercise) => ({
      exercise,
      top: (byExercise.get(exercise.id) ?? []).slice(0, 3).map((record, index) => ({
        ...record,
        rank: index + 1,
      })),
    }))
  }
}
