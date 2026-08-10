import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PubSubService } from '../pubsub/pubsub.service'
import { VoteOption } from './dto/dispute.input'

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private pubSub: PubSubService,
  ) {}

  async create(userId: string, input: { performanceId: string; reason: string }) {
    const record = await this.prisma.performanceRecord.findUnique({
      where: { id: input.performanceId },
      include: { exercise: true },
    })
    if (!record) throw new NotFoundException('Performance record not found')
    if (record.userId === userId) throw new BadRequestException('Cannot dispute your own record')

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: record.groupId, userId, isActive: true },
    })
    if (!membership) throw new ForbiddenException('Not an active member of this group')

    const openDispute = await this.prisma.dispute.findFirst({
      where: { performanceId: input.performanceId, status: 'OPEN' },
    })
    if (openDispute) throw new ConflictException('A dispute is already open for this record')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const dispute = await this.prisma.dispute.create({
      data: {
        performanceId: input.performanceId,
        groupId: record.groupId,
        initiatedById: userId,
        reason: input.reason,
        expiresAt,
        disputedValue: record.value,
      },
      include: { performance: true, initiator: true, votes: true },
    })

    // Emit real-time event
    this.pubSub.publish('disputeEvent', {
      disputeId: dispute.id,
      groupId: record.groupId,
      actorId: userId,
      type: 'CREATED',
    })

    return dispute
  }

  async vote(userId: string, disputeId: string, vote: VoteOption) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { performance: { include: { exercise: true } } },
    })
    if (!dispute) throw new NotFoundException()
    if (dispute.status !== 'OPEN') throw new BadRequestException('Dispute is already resolved')
    if (dispute.expiresAt && dispute.expiresAt < new Date()) throw new BadRequestException('Dispute expired')

    // Check if user is active member
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: dispute.performance.groupId, userId, isActive: true },
    })
    if (!membership) throw new ForbiddenException('Not an active group member')

    // Initiator cannot vote on their own dispute
    if (dispute.initiatedById === userId) throw new ForbiddenException('Initiator cannot vote')

    // Record owner cannot vote on their own dispute
    if (dispute.performance.userId === userId) throw new ForbiddenException('Record owner cannot vote')

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

    const updatedDispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { votes: true, performance: true, initiator: true },
    })

    // Emit real-time event
    this.pubSub.publish('disputeEvent', {
      disputeId,
      groupId: dispute.performance.groupId,
      actorId: userId,
      type: 'VOTE_CAST',
    })

    // Check if dispute was resolved by this vote
    if (updatedDispute && updatedDispute.status !== 'OPEN') {
      this.pubSub.publish('disputeEvent', {
        disputeId,
        groupId: dispute.performance.groupId,
        actorId: userId,
        type: 'RESOLVED',
      })
    }

    return updatedDispute
  }

  async cancel(userId: string, disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) throw new NotFoundException()
    if (dispute.status !== 'OPEN') throw new BadRequestException('Only pending disputes can be cancelled')

    const canCancel = dispute.initiatedById === userId ||
      await this.prisma.groupMember.findFirst({ where: { groupId: dispute.groupId, userId, role: 'OWNER' } })
    if (!canCancel) throw new ForbiddenException('Only creator or group owner can cancel')

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'CANCELLED', resolvedAt: new Date(), cancelledAt: new Date(), cancelledById: userId },
      include: { votes: true, performance: true, initiator: true },
    })

    // Emit real-time event
    this.pubSub.publish('disputeEvent', {
      disputeId,
      groupId: dispute.groupId,
      actorId: userId,
      type: 'CANCELLED',
    })

    return updated
  }

  private async checkResolution(disputeId: string): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        performance: { include: { exercise: true } },
        votes: true,
      },
    })
    if (!dispute || dispute.status !== 'OPEN') return

    const activeMembers = await this.prisma.groupMember.count({
      where: { groupId: dispute.performance.groupId, isActive: true },
    })

    // Eligible voters = active members - initiator - record owner
    const eligibleVoters = activeMembers - 2
    if (eligibleVoters <= 0) return // No one can vote

    const votesCast = dispute.votes.length
    if (votesCast < eligibleVoters) return // Not all voted yet

    // All eligible voters have voted - resolve immediately
    const fakeVotes = dispute.votes.filter(v => v.vote === 'FAKE').length
    const realVotes = dispute.votes.filter(v => v.vote === 'REAL').length

    const isApproved = fakeVotes > realVotes

    await this.prisma.$transaction(async (tx) => {
      if (isApproved) {
        await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: 'APPROVED',
            resolvedAt: new Date(),
            cooldownUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          },
        })
        await tx.performanceRecord.update({
          where: { id: dispute.performanceId },
          data: { deletedAt: new Date(), deletedByDisputeId: disputeId, disputeResult: 'APPROVED' },
        })
      } else {
        await tx.dispute.update({
          where: { id: disputeId },
          data: { status: 'REJECTED', resolvedAt: new Date() },
        })
        await tx.performanceRecord.update({
          where: { id: dispute.performanceId },
          data: { disputeResult: 'REJECTED' },
        })
      }
    })
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
