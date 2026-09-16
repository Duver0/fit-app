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
    this.logger.log(`Handling performance updated event for user ${event.userId}`)

    try {
      // 1. Obtener info del usuario que actualizó
      const user = await this.prisma.user.findUnique({
        where: { id: event.userId },
      })

      if (!user) {
        this.logger.warn(`User ${event.userId} not found`)
        return
      }

      // 2. Obtener info del ejercicio
      const exercise = await this.prisma.exercise.findUnique({
        where: { id: event.exerciseId },
      })

      if (!exercise) {
        this.logger.warn(`Exercise ${event.exerciseId} not found`)
        return
      }

      // 3. Enviar push a todos los miembros del grupo (excepto el autor)
      const title = 'Actualización de progreso'
      const body = `${user.name} ha actualizado su progreso en ${exercise.name}`
      const data = {
        groupId: event.groupId,
        exerciseId: event.exerciseId,
      }

      await this.notificationsService.sendPushToGroup({
        excludeUserId: event.userId,
        groupId: event.groupId,
        title,
        body,
        data,
      })

      this.logger.log(`Progress update notification sent for exercise ${exercise.name}`)
    } catch (error) {
      this.logger.error('Error handling performance updated event', error)
    }
  }
}
