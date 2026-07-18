import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca usuarios por nombre (case-insensitive).
   * Retorna hasta 10 resultados. Útil para autocomplete en invitaciones.
   */
  async searchUsers(query: string) {
    if (!query || query.trim().length < 2) return []
    return this.prisma.user.findMany({
      where: {
        name: { contains: query.trim(), mode: 'insensitive' },
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      take: 10,
    })
  }

  /**
   * Invite a user to a group by searching for their email, phone, or full name.
   * For security reasons, we do NOT reveal whether a user was found or not —
   * if no match is found we return a generic success message but don't create
   * the invitation. This prevents user enumeration attacks.
   */
  async invite(groupId: string, inviteeIdentifier: string, inviterId: string) {
    // Try to find the user by email, phone, or name
    const userExists = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: inviteeIdentifier, mode: 'insensitive' } },
          { phone: inviteeIdentifier },
          { name: { equals: inviteeIdentifier, mode: 'insensitive' } },
        ],
      },
    })

    // Don't reveal if user was found — throw same error regardless
    // This prevents user enumeration attacks
    if (!userExists) throw new BadRequestException('No se pudo enviar la invitación. Verificá los datos e intentá de nuevo.')

    const inviteeEmail = userExists.email

    // Check if already a member
    const existing = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: userExists.id },
    })
    if (existing) throw new BadRequestException('El usuario ya es miembro del grupo')

    // Check for existing pending invitation
    const pending = await this.prisma.invitation.findFirst({
      where: { groupId, inviteeEmail, status: 'PENDING' },
    })
    if (pending) throw new BadRequestException('Ya se envió una invitación a este usuario')

    return this.prisma.invitation.create({
      data: { groupId, inviteeEmail, inviterId },
      include: { group: true, inviter: true },
    })
  }

  async accept(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } })
    if (!invitation) throw new NotFoundException()
    if (invitation.status !== 'PENDING') throw new BadRequestException('La invitación ya no está pendiente')

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (user?.email !== invitation.inviteeEmail) throw new BadRequestException('El correo no coincide con la invitación')

    await this.prisma.$transaction([
      this.prisma.invitation.update({ where: { id: invitationId }, data: { status: 'ACCEPTED' } }),
      this.prisma.groupMember.create({
        data: { groupId: invitation.groupId, userId, role: 'MEMBER' },
      }),
    ])
    return true
  }

  async decline(invitationId: string) {
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'DECLINED' },
    })
    return true
  }

  async findByUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException()
    return this.prisma.invitation.findMany({
      where: { inviteeEmail: user.email, status: 'PENDING' },
      include: { group: true, inviter: true },
    })
  }
}
