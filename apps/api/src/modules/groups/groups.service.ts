import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PubSubService } from '../pubsub/pubsub.service'

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private pubSub: PubSubService,
  ) {}

  async findByUser(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            owner: true,
            members: { include: { user: true } },
            _count: { select: { members: true } },
          },
        },
      },
    })
    return memberships.map(m => ({
      ...m.group,
      memberCount: m.group._count.members,
    }))
  }

  async findById(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        owner: true,
        members: { include: { user: true } },
        exercises: { include: { creator: true, category: true } },
        categories: { include: { exercises: { include: { creator: true } } }, orderBy: { name: 'asc' } },
        _count: { select: { members: true } },
      },
    })
    if (!group) throw new NotFoundException('Group not found')
    return { ...group, memberCount: group._count.members }
  }

  async create(userId: string, data: { name: string; description?: string; avatarUrl?: string }) {
    // Asignar avatar aleatorio de DiceBear (identicon) si no se especifica uno
    const avatarUrl = data.avatarUrl || `https://api.dicebear.com/10.x/identicon/png?seed=${encodeURIComponent(data.name)}&size=200`

    const group = await this.prisma.group.create({
      data: {
        ...data,
        avatarUrl,
        ownerId: userId,
        members: { create: { userId, role: 'OWNER' } },
      },
      include: { _count: { select: { members: true } } },
    })
    return { ...group, memberCount: group._count.members }
  }

  async update(id: string, userId: string, data: { name?: string; description?: string; avatarUrl?: string }) {
    const group = await this.prisma.group.findUnique({ where: { id } })
    if (!group) throw new NotFoundException()
    if (group.ownerId !== userId) throw new ForbiddenException('Only the owner can update the group')
    return this.prisma.group.update({ where: { id }, data })
  }

  async delete(id: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id } })
    if (!group) throw new NotFoundException()
    if (group.ownerId !== userId) throw new ForbiddenException()
    await this.prisma.group.delete({ where: { id } })
    return true
  }

  async removeMember(groupId: string, memberId: string, actorId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } })
    if (!group || group.ownerId !== actorId) throw new ForbiddenException()
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId: memberId } })

    // Emit real-time event
    this.pubSub.publish('groupMemberEvent', {
      groupId,
      userId: memberId,
      actorId,
      type: 'REMOVED',
    })

    return true
  }

  async adminUpdate(id: string, data: { name?: string; description?: string }) {
    const group = await this.prisma.group.update({
      where: { id },
      data,
      include: {
        owner: true,
        members: { include: { user: true } },
        _count: { select: { members: true } },
      },
    })
    return { ...group, memberCount: group._count.members }
  }

  async adminDelete(id: string) {
    await this.prisma.group.delete({ where: { id } })
    return true
  }

  async leaveGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new NotFoundException()
    if (group.ownerId === userId) throw new ForbiddenException('Owner cannot leave the group. Transfer ownership or delete the group first.')
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId } })

    // Emit real-time event
    this.pubSub.publish('groupMemberEvent', {
      groupId,
      userId,
      actorId: userId,
      type: 'LEFT',
    })

    return true
  }

  async adminFindAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, totalCount] = await Promise.all([
      this.prisma.group.findMany({ skip, take: limit, include: { _count: { select: { members: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.group.count(),
    ])
    return {
      items: items.map(g => ({ ...g, memberCount: g._count.members })),
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    }
  }
}
