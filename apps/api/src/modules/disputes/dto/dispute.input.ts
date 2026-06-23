import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class CreateDisputeInput {
  @Field()
  performanceId: string

  @Field()
  reason: string
}
