import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql'
import { DisputeStatus, VoteOption } from '@prisma/client'
import { User } from './user.model'
import { PerformanceRecord } from './performance.model'

registerEnumType(DisputeStatus, { name: 'DisputeStatus' })
registerEnumType(VoteOption, { name: 'VoteOption' })

@ObjectType()
export class DisputeVote {
  @Field(() => ID)
  id: string

  @Field(() => User)
  user: User

  @Field(() => VoteOption)
  vote: VoteOption

  @Field()
  createdAt: Date
}

@ObjectType()
export class Dispute {
  @Field(() => ID)
  id: string

  @Field(() => PerformanceRecord)
  performance: PerformanceRecord

  @Field(() => User)
  initiatedBy: User

  @Field()
  reason: string

  @Field(() => DisputeStatus)
  status: DisputeStatus

  @Field(() => [DisputeVote])
  votes: DisputeVote[]

  @Field()
  createdAt: Date

  @Field()
  expiresAt: Date

  @Field(() => Int)
  voteCount: number

  @Field(() => Int)
  groupMemberCount: number
}
