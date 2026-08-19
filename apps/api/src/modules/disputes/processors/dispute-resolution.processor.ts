import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../../prisma/prisma.service'
import { resolveExpiredDisputes } from '../dispute-resolution.logic'

@Injectable()
export class DisputeResolutionProcessor {
  private readonly logger = new Logger(DisputeResolutionProcessor.name)

  constructor(
    private prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async resolveExpiredDisputes() {
    this.logger.log('Checking expired disputes...')
    const result = await resolveExpiredDisputes(this.prisma)
    this.logger.log(
      `Resolved ${result.resolved} disputes (${result.approved} approved, ${result.rejected} rejected)`,
    )
  }
}
