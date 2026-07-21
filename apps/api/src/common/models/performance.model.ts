import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql'
import { User } from './user.model'
import { Exercise } from './exercise.model'

@ObjectType()
export class PerformanceRecord {
  @Field(() => ID)
  id: string

  @Field(() => Exercise)
  exercise: Exercise

  @Field(() => User)
  user: User

  @Field()
  groupId: string

  @Field()
  value: number

  @Field(() => Int, { nullable: true, description: 'Número de repeticiones (solo para ejercicios REPS_AND_WEIGHT)' })
  reps?: number

  @Field(() => Float, { nullable: true, description: 'Peso en kg (solo para ejercicios REPS_AND_WEIGHT)' })
  weight?: number

  @Field()
  recordedAt: Date

  @Field()
  updatedAt: Date

  @Field(() => Int, { nullable: true })
  rank?: number
}

@ObjectType()
export class RankingConnection {
  @Field(() => [PerformanceRecord])
  items: PerformanceRecord[]

  @Field()
  totalCount: number

  @Field()
  currentPage: number

  @Field()
  totalPages: number
}

@ObjectType()
export class ExerciseRankingPreview {
  @Field(() => Exercise)
  exercise: Exercise

  @Field(() => [PerformanceRecord])
  top: PerformanceRecord[]
}
