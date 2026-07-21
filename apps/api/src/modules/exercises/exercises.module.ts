import { Module } from '@nestjs/common'
import { ExercisesResolver, ExerciseFieldsResolver } from './exercises.resolver'
import { ExercisesService } from './exercises.service'
import { WgerService } from './wger.service'

@Module({
  providers: [ExercisesResolver, ExerciseFieldsResolver, ExercisesService, WgerService],
  exports: [ExercisesService, WgerService],
})
export class ExercisesModule {}
