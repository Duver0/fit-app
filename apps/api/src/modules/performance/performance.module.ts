import { Module } from '@nestjs/common'
import { PerformanceResolver } from './performance.resolver'
import { PerformanceService } from './performance.service'

@Module({
  providers: [PerformanceResolver, PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
