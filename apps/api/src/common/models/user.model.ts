import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql'
import { UserRole } from '@prisma/client'

export { UserRole }

registerEnumType(UserRole, { name: 'UserRole' })

@ObjectType()
export class User {
  @Field(() => ID)
  id: string

  @Field()
  auth0Id: string

  @Field()
  email: string

  @Field({ nullable: true })
  phone?: string | null

  @Field()
  name: string

  @Field({ nullable: true })
  avatarUrl?: string | null

  @Field(() => UserRole)
  role: UserRole

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string

  @Field(() => User)
  user: User
}

@ObjectType()
export class UserConnection {
  @Field(() => [User])
  items: User[]

  @Field()
  totalCount: number

  @Field()
  currentPage: number

  @Field()
  totalPages: number
}
