import { InputType, Field } from '@nestjs/graphql'
import { IsUUID, IsNumber, Min } from 'class-validator'

@InputType()
export class UpsertPerformanceInput {
  @Field()
  @IsUUID()
  exerciseId: string

  @Field()
  @IsNumber()
  @Min(0)
  value: number
}
