import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, input: { exerciseId: string; value: number }) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: input.exerciseId },
    })
    if (!exercise) throw new NotFoundException('Exercise not found')

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('You are not a member of this group')

    const existing = await this.prisma.performanceRecord.findUnique({
      where: { exerciseId_userId_groupId: { exerciseId: input.exerciseId, userId, groupId: exercise.groupId } },
    })

    if (existing) {
      return this.prisma.performanceRecord.update({
        where: { id: existing.id },
        data: { value: input.value },
      })
    }

    return this.prisma.performanceRecord.create({
      data: {
        exerciseId: input.exerciseId,
        userId,
        groupId: exercise.groupId,
        value: input.value,
      },
    })
  }

  async findByUserAndExercise(userId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } })
    if (!exercise) return null
    return this.prisma.performanceRecord.findUnique({
      where: { exerciseId_userId_groupId: { exerciseId, userId, groupId: exercise.groupId } },
    })
  }
}
