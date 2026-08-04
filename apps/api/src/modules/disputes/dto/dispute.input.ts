import { InputType, Field } from '@nestjs/graphql'
import { IsUUID, IsString, MinLength, MaxLength, IsEnum } from 'class-validator'
import { VoteOption } from '@prisma/client'

export { VoteOption }

@InputType()
export class CreateDisputeInput {
  @Field()
  @IsUUID()
  performanceId: string

  @Field()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string
}

@InputType()
export class VoteDisputeInput {
  @Field()
  @IsUUID()
  disputeId: string

  @Field(() => VoteOption)
  @IsEnum(VoteOption)
  vote: VoteOption
}
