import { ObjectType, Field, ID } from '@nestjs/graphql'
import { User } from '../../common/models/user.model'
import { Exercise } from './exercise.model'

@ObjectType()
export class GroupMember {
  @Field(() => ID)
  id: string

  @Field(() => User)
  user: User

  @Field()
  role: string

  @Field()
  joinedAt: Date
}

@ObjectType()
export class Group {
  @Field(() => ID)
  id: string

  @Field()
  name: string

  @Field(() => String, { nullable: true })
  description?: string | null

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null

  @Field(() => User)
  owner: User

  @Field()
  memberCount: number

  @Field(() => [GroupMember])
  members: GroupMember[]

  @Field(() => [Exercise])
  exercises: Exercise[]

  @Field(() => Date)
  createdAt: Date

  @Field(() => Date)
  updatedAt: Date
}

@ObjectType()
export class GroupConnection {
  @Field(() => [Group])
  items: Group[]

  @Field()
  totalCount: number

  @Field()
  currentPage: number

  @Field()
  totalPages: number
}
