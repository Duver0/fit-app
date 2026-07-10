import { InputType, Field } from '@nestjs/graphql'
import { IsUUID, IsString, MinLength, MaxLength } from 'class-validator'

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
