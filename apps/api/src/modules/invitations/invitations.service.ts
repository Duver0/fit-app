import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  async invite(groupId: string, inviteeEmail: string, inviterId: string) {
    const userExists = await this.prisma.user.findUnique({ where: { email: inviteeEmail } })
    if (!userExists) throw new NotFoundException('No existe una cuenta con ese correo electrónico')

    const existing = await this.prisma.groupMember.findFirst({
      where: { groupId, user: { email: inviteeEmail } },
    })
    if (existing) throw new BadRequestException('User is already a member')

    const pending = await this.prisma.invitation.findFirst({
      where: { groupId, inviteeEmail, status: 'PENDING' },
    })
    if (pending) throw new BadRequestException('Invitation already sent')

    return this.prisma.invitation.create({
      data: { groupId, inviteeEmail, inviterId },
      include: { group: true, inviter: true },
    })
  }

  async accept(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } })
    if (!invitation) throw new NotFoundException()
    if (invitation.status !== 'PENDING') throw new BadRequestException('Invitation is not pending')

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (user?.email !== invitation.inviteeEmail) throw new BadRequestException('Email does not match')

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
