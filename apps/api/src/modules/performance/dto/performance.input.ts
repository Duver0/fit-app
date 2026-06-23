import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class UpsertPerformanceInput {
  @Field()
  exerciseId: string

  @Field()
  value: number
}
