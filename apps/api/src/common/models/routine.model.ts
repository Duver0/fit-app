import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql'
import { Exercise, ExerciseUnit } from './exercise.model'
import { PerformanceRecord } from './performance.model'
import { Group } from './group.model'

@ObjectType()
export class RoutineDay {
  @Field(() => ID)
  id: string

  @Field(() => Int)
  dayOfWeek: number

  @Field({ nullable: true, description: 'Custom name for this day (e.g. "Pecho - Tríceps")' })
  name?: string

  @Field(() => [RoutineExercise])
  exercises: RoutineExercise[]
}

@ObjectType()
export class RoutineExercise {
  @Field(() => ID)
  id: string

  @Field(() => Exercise)
  exercise: Exercise

  @Field(() => Group, { nullable: true, description: 'The group this exercise belongs to' })
  group?: Group

  @Field(() => Int)
  sortOrder: number

  @Field(() => PerformanceRecord, { nullable: true })
  myPerformance?: PerformanceRecord
}

@ObjectType()
export class PerformanceSummary {
  @Field(() => ID)
  id: string

  @Field()
  value: number

  @Field(() => Int, { nullable: true })
  reps?: number

  @Field(() => Float, { nullable: true })
  weight?: number
}

@ObjectType()
export class ExerciseWithPerformance {
  @Field(() => ID)
  id: string

  @Field()
  name: string

  @Field(() => ExerciseUnit)
  unit: ExerciseUnit

  @Field({ nullable: true })
  imageUrl?: string

  @Field()
  groupId: string

  @Field(() => Group, { nullable: true })
  group?: Group

  @Field(() => PerformanceSummary, { nullable: true })
  myPerformance?: PerformanceSummary
}
