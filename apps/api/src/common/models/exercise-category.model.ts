import { ObjectType, Field, ID } from '@nestjs/graphql'
import { Exercise } from './exercise.model'
import { User } from './user.model'

@ObjectType()
export class ExerciseCategory {
  @Field(() => ID)
  id: string

  @Field()
  groupId: string

  @Field()
  name: string

  @Field(() => User, { name: 'createdBy' })
  creator: User

  @Field(() => [Exercise])
  exercises: Exercise[]

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}
