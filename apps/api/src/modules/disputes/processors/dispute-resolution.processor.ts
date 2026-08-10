import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../../prisma/prisma.service'
import { PubSubService } from '../../pubsub/pubsub.service'

@Injectable()
export class DisputeResolutionProcessor {
  private readonly logger = new Logger(DisputeResolutionProcessor.name)

  constructor(
    private prisma: PrismaService,
    private pubSub: PubSubService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async resolveExpiredDisputes() {
    this.logger.log('Checking expired disputes...')

    const expiredDisputes = await this.prisma.dispute.findMany({
      where: {
        status: 'OPEN',
        expiresAt: { lte: new Date() },
      },
      include: {
        votes: true,
        performance: {
          include: { exercise: true },
        },
      },
    })

    for (const dispute of expiredDisputes) {
      const membersCount = await this.prisma.groupMember.count({
        where: { groupId: dispute.performance.groupId },
      })

      const approveVotes = dispute.votes.filter((v: any) => v.vote).length
      const percentage = membersCount > 0 ? (approveVotes / membersCount) * 100 : 0

      if (percentage >= 51) {
        this.logger.log(`Dispute ${dispute.id}: APPROVED (${percentage}%)`)
        await this.prisma.$transaction([
          this.prisma.dispute.update({
            where: { id: dispute.id },
            data: { status: 'APPROVED', resolvedAt: new Date() },
          }),
          this.prisma.performanceRecord.delete({
            where: { id: dispute.performanceId },
          }),
        ])

        // Emit real-time event for auto-resolved dispute
        this.pubSub.publish('disputeEvent', {
          disputeId: dispute.id,
          groupId: dispute.performance.groupId,
          actorId: dispute.initiatedById,
          type: 'RESOLVED',
        })
      } else {
        this.logger.log(`Dispute ${dispute.id}: REJECTED (${percentage}%)`)
        await this.prisma.dispute.update({
          where: { id: dispute.id },
          data: { status: 'REJECTED', resolvedAt: new Date() },
        })

        // Emit real-time event for auto-resolved dispute
        this.pubSub.publish('disputeEvent', {
          disputeId: dispute.id,
          groupId: dispute.performance.groupId,
          actorId: dispute.initiatedById,
          type: 'RESOLVED',
        })
      }
    }
  }
}
