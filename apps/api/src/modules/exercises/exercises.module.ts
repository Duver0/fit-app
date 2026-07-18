import { Module } from '@nestjs/common'
import { ExercisesResolver } from './exercises.resolver'
import { ExercisesService } from './exercises.service'
import { WgerService } from './wger.service'

@Module({
  providers: [ExercisesResolver, ExercisesService, WgerService],
  exports: [ExercisesService, WgerService],
})
export class ExercisesModule {}
