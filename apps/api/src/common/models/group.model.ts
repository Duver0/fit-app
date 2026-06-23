import { ObjectType, Field, ID } from '@nestjs/graphql'
import { User } from '../../common/models/user.model'

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

  @Field({ nullable: true })
  description?: string | null

  @Field({ nullable: true })
  avatarUrl?: string | null

  @Field(() => User)
  owner: User

  @Field()
  memberCount: number

  @Field(() => [GroupMember])
  members: GroupMember[]

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
