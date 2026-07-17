import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql'
import { ExerciseUnit } from '@prisma/client'
import { User } from './user.model'

export { ExerciseUnit }

registerEnumType(ExerciseUnit, { name: 'ExerciseUnit' })

@ObjectType()
export class Exercise {
  @Field(() => ID)
  id: string

  @Field()
  groupId: string

  @Field()
  name: string

  @Field(() => ExerciseUnit)
  unit: ExerciseUnit

  @Field({ nullable: true })
  imageUrl?: string

  @Field(() => User, { name: 'createdBy', description: 'User who created the exercise (resolved from Prisma creator relation)' })
  creator: User

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class ExerciseConnection {
  @Field(() => [Exercise])
  items: Exercise[]

  @Field()
  totalCount: number

  @Field()
  currentPage: number

  @Field()
  totalPages: number
}
