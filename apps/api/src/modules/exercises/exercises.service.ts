import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ExerciseUnit } from '@prisma/client'

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findByGroup(groupId: string) {
    return this.prisma.exercise.findMany({
      where: { groupId },
      include: { creator: true },
    })
  }

  async findById(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { creator: true },
    })
    if (!exercise) throw new NotFoundException()
    return exercise
  }

  async create(userId: string, data: { groupId: string; name: string; unit?: string; imageUrl?: string }) {
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
        ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
      },
      include: { creator: true },
    })
  }

  async updateImage(id: string, userId: string, imageUrl: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException()

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('You must be a group member to update exercise image')

    return this.prisma.exercise.update({
      where: { id },
      data: { imageUrl },
      include: { creator: true },
    })
  }

  async update(id: string, userId: string, data: { name?: string; imageUrl?: string }) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado')

    // Allow update if user is the group owner OR the exercise creator
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId, role: 'OWNER' },
    })
    const isCreator = exercise.createdBy === userId
    if (!membership && !isCreator) {
      throw new ForbiddenException('Solo el dueño del grupo o el creador del ejercicio puede editarlo')
    }

    return this.prisma.exercise.update({
      where: { id },
      data,
      include: { creator: true },
    })
  }

  async enrichFromWger(
    id: string,
    userId: string,
    wgerData: {
      wgerId?: number
      imageUrl?: string
      wgerCategory?: string
      wgerMuscles?: string[]
      wgerEquipment?: string[]
      wgerInstructions?: string
    },
  ) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado')

    // Allow if group member
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId },
    })
    if (!membership) {
      throw new ForbiddenException('Debes ser miembro del grupo para enriquecer un ejercicio')
    }

    const data: any = {}
    if (wgerData.wgerId !== undefined) data.wgerId = wgerData.wgerId
    if (wgerData.imageUrl !== undefined) data.imageUrl = wgerData.imageUrl
    if (wgerData.wgerCategory !== undefined) data.wgerCategory = wgerData.wgerCategory
    if (wgerData.wgerMuscles !== undefined) data.wgerMuscles = JSON.stringify(wgerData.wgerMuscles)
    if (wgerData.wgerEquipment !== undefined) data.wgerEquipment = JSON.stringify(wgerData.wgerEquipment)
    if (wgerData.wgerInstructions !== undefined) data.wgerInstructions = wgerData.wgerInstructions

    return this.prisma.exercise.update({
      where: { id },
      data,
      include: { creator: true },
    })
  }

  async delete(id: string, userId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado')

    // Allow deletion if user is the group owner OR the exercise creator
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId, role: 'OWNER' },
    })
    const isCreator = exercise.createdBy === userId

    if (!membership && !isCreator) {
      throw new ForbiddenException('Solo el dueño del grupo o el creador del ejercicio puede eliminarlo')
    }

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
