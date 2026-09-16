import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsResolver } from './notifications.resolver'
import { ProgressUpdateObserver } from './observers/progress-update.observer'

@Module({
  providers: [NotificationsService, NotificationsResolver, ProgressUpdateObserver],
  exports: [NotificationsService],
})
export class NotificationsModule {}
