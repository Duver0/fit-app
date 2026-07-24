import { ObjectType, Field, ID, Int } from '@nestjs/graphql'
import { Exercise } from './exercise.model'
import { PerformanceRecord } from './performance.model'

@ObjectType()
export class RoutineDay {
  @Field(() => ID)
  id: string

  @Field(() => Int)
  dayOfWeek: number

  @Field(() => [RoutineExercise])
  exercises: RoutineExercise[]
}

@ObjectType()
export class RoutineExercise {
  @Field(() => ID)
  id: string

  @Field(() => Exercise)
  exercise: Exercise

  @Field(() => Int)
  sortOrder: number

  @Field(() => PerformanceRecord, { nullable: true })
  myPerformance?: PerformanceRecord
}
