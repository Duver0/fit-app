import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { DisputesResolver } from './disputes.resolver'
import { DisputesService } from './disputes.service'
import { DisputeResolutionProcessor } from './processors/dispute-resolution.processor'

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DisputesResolver, DisputesService, DisputeResolutionProcessor],
  exports: [DisputesService],
})
export class DisputesModule {}
