import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from '../../../prisma/prisma.service'
import { NotificationsService } from '../notifications.service'
import { PerformanceUpdatedEvent } from './events/performance-updated.event'

@Injectable()
export class ProgressUpdateObserver {
  private readonly logger = new Logger(ProgressUpdateObserver.name)

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @OnEvent('performance.updated')
  async handlePerformanceUpdated(event: PerformanceUpdatedEvent) {
    this.logger.log(`🔔 Performance updated event received`)
    this.logger.log(`   User ID: ${event.userId}`)
    this.logger.log(`   Exercise ID: ${event.exerciseId}`)
    this.logger.log(`   Group ID: ${event.groupId}`)

    try {
      // 1. Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: event.userId },
      })

      if (!user) {
        this.logger.warn(`⚠️ User ${event.userId} not found`)
        return
      }

      // 2. Get exercise info
      const exercise = await this.prisma.exercise.findUnique({
        where: { id: event.exerciseId },
      })

      if (!exercise) {
        this.logger.warn(`⚠️ Exercise ${event.exerciseId} not found`)
        return
      }

      // 3. Build notification
      const title = 'Actualización de progreso'
      const body = `${user.name} ha actualizado su marca en ${exercise.name}`
      const data = {
        groupId: event.groupId,
        exerciseId: event.exerciseId,
      }

      this.logger.log(`📤 Sending notification: "${title}" - "${body}"`)

      // 4. Send push to group
      const result = await this.notificationsService.sendPushToGroup({
        excludeUserId: event.userId,
        groupId: event.groupId,
        title,
        body,
        data,
      })

      this.logger.log(`✅ Notification sent: ${result.sent}/${result.total} successful`)
      
      if (result.errors && result.errors.length > 0) {
        this.logger.error(`❌ Errors: ${result.errors.join('; ')}`)
      }
    } catch (error) {
      this.logger.error('❌ Error handling performance updated event', error)
    }
  }
}
