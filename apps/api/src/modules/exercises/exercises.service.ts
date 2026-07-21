import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ExerciseUnit } from '@prisma/client'

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name)
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
    this.logger.log(`→ delete() called | id="${id}" | userId="${userId}"`)

    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { performances: { include: { disputes: { include: { votes: true } } } } },
    })
    if (!exercise) {
      this.logger.warn(`✕ Exercise not found | id="${id}"`)
      throw new NotFoundException('Ejercicio no encontrado')
    }
    this.logger.log(`✓ Exercise found | name="${exercise.name}" | groupId="${exercise.groupId}" | createdBy="${exercise.createdBy}" | performances=${exercise.performances.length}`)

    // Allow deletion if user is the group owner OR the exercise creator
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId, role: 'OWNER' },
    })
    const isCreator = exercise.createdBy === userId
    this.logger.log(`Auth check | isOwner=${!!membership} | isCreator=${isCreator} (createdBy="${exercise.createdBy}" === userId="${userId}")`)

    if (!membership && !isCreator) {
      this.logger.warn(`✕ Forbidden | userId="${userId}" is neither owner nor creator of exercise "${id}"`)
      throw new ForbiddenException('Solo el dueño del grupo o el creador del ejercicio puede eliminarlo')
    }

    // Eliminación explícita en orden para evitar problemas de cascada
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Obtener todos los performance records del ejercicio
        const perfRecords = await tx.performanceRecord.findMany({
          where: { exerciseId: id },
          select: { id: true },
        })
        const perfIds = perfRecords.map(p => p.id)

        if (perfIds.length > 0) {
          this.logger.log(`→ Deleting ${perfIds.length} performance records with disputes and votes`)

          // 2. Eliminar dispute votes de las disputas de estos performance records
          await tx.disputeVote.deleteMany({
            where: { dispute: { performanceId: { in: perfIds } } },
          })

          // 3. Eliminar las disputas
          await tx.dispute.deleteMany({
            where: { performanceId: { in: perfIds } },
          })

          // 4. Eliminar los performance records
          await tx.performanceRecord.deleteMany({
            where: { exerciseId: id },
          })
        }

        // 5. Finalmente eliminar el ejercicio
        await tx.exercise.delete({ where: { id } })
      })

      this.logger.log(`✓ Exercise "${id}" deleted successfully (with ${exercise.performances.length} performances)`)
    } catch (error: any) {
      this.logger.error(`✕ Delete failed | id="${id}" | error="${error.message}"`, error.stack)
      throw error
    }
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
