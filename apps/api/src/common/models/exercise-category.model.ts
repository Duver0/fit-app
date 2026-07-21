import { ObjectType, Field, ID } from '@nestjs/graphql'
import { Exercise } from './exercise.model'

@ObjectType()
export class ExerciseCategory {
  @Field(() => ID)
  id: string

  @Field()
  groupId: string

  @Field()
  name: string

  @Field(() => [Exercise])
  exercises: Exercise[]

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}
