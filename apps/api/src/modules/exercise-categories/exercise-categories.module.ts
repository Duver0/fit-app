import { Module } from '@nestjs/common'
import { ExerciseCategoriesResolver } from './exercise-categories.resolver'
import { ExerciseCategoriesService } from './exercise-categories.service'

@Module({
  providers: [ExerciseCategoriesResolver, ExerciseCategoriesService],
  exports: [ExerciseCategoriesService],
})
export class ExerciseCategoriesModule {}
