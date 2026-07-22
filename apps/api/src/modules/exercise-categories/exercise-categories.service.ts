import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ExerciseCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findByGroup(groupId: string) {
    return this.prisma.exerciseCategory.findMany({
      where: { groupId },
      include: { exercises: { include: { creator: true } }, creator: true },
      orderBy: { name: 'asc' },
    })
  }

  async findById(id: string) {
    const category = await this.prisma.exerciseCategory.findUnique({
      where: { id },
      include: { exercises: { include: { creator: true } }, creator: true },
    })
    if (!category) throw new NotFoundException('Categoría no encontrada')
    return category
  }

  async create(userId: string, data: { groupId: string; name: string }) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('Debes ser miembro del grupo para crear categorías')

    const existing = await this.prisma.exerciseCategory.findUnique({
      where: { groupId_name: { groupId: data.groupId, name: data.name } },
    })
    if (existing) throw new ForbiddenException('Ya existe una categoría con ese nombre en este grupo')

    return this.prisma.exerciseCategory.create({
      data: { groupId: data.groupId, name: data.name, createdBy: userId },
      include: { exercises: true, creator: true },
    })
  }

  async update(id: string, userId: string, data: { name: string }) {
    const category = await this.prisma.exerciseCategory.findUnique({ where: { id } })
    if (!category) throw new NotFoundException('Categoría no encontrada')

    const isOwner = await this.prisma.groupMember.findFirst({
      where: { groupId: category.groupId, userId, role: 'OWNER' },
    })
    const isCreator = category.createdBy === userId
    if (!isOwner && !isCreator) {
      throw new ForbiddenException('Solo el dueño del grupo o el creador de la categoría puede editarla')
    }

    const existing = await this.prisma.exerciseCategory.findUnique({
      where: { groupId_name: { groupId: category.groupId, name: data.name } },
    })
    if (existing && existing.id !== id) throw new ForbiddenException('Ya existe una categoría con ese nombre')

    return this.prisma.exerciseCategory.update({
      where: { id },
      data: { name: data.name },
      include: { exercises: true, creator: true },
    })
  }

  async delete(id: string, userId: string) {
    const category = await this.prisma.exerciseCategory.findUnique({ where: { id } })
    if (!category) throw new NotFoundException('Categoría no encontrada')

    const isOwner = await this.prisma.groupMember.findFirst({
      where: { groupId: category.groupId, userId, role: 'OWNER' },
    })
    const isCreator = category.createdBy === userId
    if (!isOwner && !isCreator) {
      throw new ForbiddenException('Solo el dueño del grupo o el creador de la categoría puede eliminarla')
    }

    // Remove category reference from exercises
    await this.prisma.exercise.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    })

    await this.prisma.exerciseCategory.delete({ where: { id } })
    return true
  }
}
