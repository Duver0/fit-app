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

  @Field(() => String, { nullable: true })
  phone?: string | null

  @Field()
  name: string

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null

  @Field(() => UserRole)
  role: UserRole

  @Field({ defaultValue: false, description: 'Whether the routine tab is enabled for this user' })
  routineEnabled: boolean

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
