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

  async getTop3(groupId: string) {
    const exercises = await this.prisma.exercise.findMany({ where: { groupId } })
    const result = await Promise.all(
      exercises.map(async (exercise) => {
        const top = await this.prisma.performanceRecord.findMany({
          where: { exerciseId: exercise.id },
          orderBy: { value: 'desc' },
          take: 3,
          include: { user: true },
        })
        return {
          exercise,
          top: top.map((record, index) => ({ ...record, rank: index + 1 })),
        }
      }),
    )
    return result
  }
}
