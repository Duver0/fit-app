import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ExerciseUnit } from '@prisma/client'

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findByGroup(groupId: string) {
    return this.prisma.exercise.findMany({ where: { groupId } })
  }

  async findById(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException()
    return exercise
  }

  async create(userId: string, data: { groupId: string; name: string; unit?: string }) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('You must be a group member to create exercises')

    return this.prisma.exercise.create({
      data: {
        groupId: data.groupId,
        name: data.name,
        createdBy: userId,
        unit: (data.unit as ExerciseUnit) || ExerciseUnit.KG,
      },
    })
  }

  async delete(id: string, userId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException()

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId, role: 'OWNER' },
    })
    if (!membership) throw new ForbiddenException()

    await this.prisma.exercise.delete({ where: { id } })
    return true
  }

  async adminDelete(id: string) {
    await this.prisma.exercise.delete({ where: { id } })
    return true
  }

  async adminFindAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, totalCount] = await Promise.all([
      this.prisma.exercise.findMany({ skip, take: limit, include: { group: true } }),
      this.prisma.exercise.count(),
    ])
    return { items, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) }
  }
}
