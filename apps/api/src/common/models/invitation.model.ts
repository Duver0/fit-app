import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql'
import { InviteStatus } from '@prisma/client'
import { Group } from './group.model'
import { User } from './user.model'

registerEnumType(InviteStatus, { name: 'InviteStatus' })

@ObjectType()
export class Invitation {
  @Field(() => ID)
  id: string

  @Field(() => Group)
  group: Group

  @Field(() => User)
  inviter: User

  @Field()
  inviteeEmail: string

  @Field(() => InviteStatus)
  status: InviteStatus

  @Field()
  createdAt: Date
}
