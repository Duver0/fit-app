import { Module } from '@nestjs/common'
import { RoutinesResolver } from './routines.resolver'
import { RoutinesService } from './routines.service'

@Module({
  providers: [RoutinesResolver, RoutinesService],
  exports: [RoutinesService],
})
export class RoutinesModule {}
