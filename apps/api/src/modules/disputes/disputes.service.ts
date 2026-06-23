import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DisputesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, input: { performanceId: string; reason: string }) {
    const record = await this.prisma.performanceRecord.findUnique({
      where: { id: input.performanceId },
      include: { exercise: true },
    })
    if (!record) throw new NotFoundException('Performance record not found')
    if (record.userId === userId) throw new BadRequestException('Cannot dispute your own record')

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: record.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('Not a member of this group')

    const openDispute = await this.prisma.dispute.findFirst({
      where: { performanceId: input.performanceId, status: 'OPEN' },
    })
    if (openDispute) throw new BadRequestException('A dispute is already open for this record')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    return this.prisma.dispute.create({
      data: {
        performanceId: input.performanceId,
        initiatedById: userId,
        reason: input.reason,
        expiresAt,
      },
      include: { performance: true, initiator: true, votes: true },
    })
  }

  async vote(userId: string, disputeId: string, vote: boolean) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { performance: { include: { exercise: true } } },
    })
    if (!dispute) throw new NotFoundException()
    if (dispute.status !== 'OPEN') throw new BadRequestException('Dispute is already resolved')

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: dispute.performance.groupId, userId },
    })
    if (!membership) throw new ForbiddenException()

    const existingVote = await this.prisma.disputeVote.findUnique({
      where: { disputeId_userId: { disputeId, userId } },
    })

    if (existingVote) {
      await this.prisma.disputeVote.update({
        where: { id: existingVote.id },
        data: { vote },
      })
    } else {
      await this.prisma.disputeVote.create({
        data: { disputeId, userId, vote },
      })
    }

    await this.checkResolution(disputeId)
    return this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { votes: true, performance: true, initiator: true },
    })
  }

  private async checkResolution(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        performance: { include: { exercise: true } },
        votes: true,
      },
    })
    if (!dispute || dispute.status !== 'OPEN') return

    const membersCount = await this.prisma.groupMember.count({
      where: { groupId: dispute.performance.groupId },
    })

    const approveVotes = dispute.votes.filter(v => v.vote).length
    const percentage = (approveVotes / membersCount) * 100

    if (percentage >= 51) {
      await this.prisma.$transaction([
        this.prisma.dispute.update({
          where: { id: disputeId },
          data: { status: 'APPROVED', resolvedAt: new Date() },
        }),
        this.prisma.performanceRecord.delete({
          where: { id: dispute.performanceId },
        }),
      ])
    }
  }

  async findByPerformance(performanceId: string) {
    return this.prisma.dispute.findMany({
      where: { performanceId },
      include: { votes: true, initiator: true, performance: true },
    })
  }

  async findByUser(userId: string) {
    return this.prisma.dispute.findMany({
      where: {
        OR: [
          { initiatedById: userId },
          { votes: { some: { userId } } },
        ],
      },
      include: { votes: true, initiator: true, performance: { include: { exercise: true } } },
    })
  }
}
