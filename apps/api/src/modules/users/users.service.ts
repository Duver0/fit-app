import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByAuth0Id(auth0Id: string) {
    return this.prisma.user.findUnique({ where: { auth0Id } })
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async updateProfile(id: string, data: { name?: string; phone?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id }, data })
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, totalCount] = await Promise.all([
      this.prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count(),
    ])
    return {
      items,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    }
  }
}
