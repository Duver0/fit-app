import { InputType, Field, Int, Float } from '@nestjs/graphql'
import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator'

@InputType()
export class UpsertPerformanceInput {
  @Field()
  @IsUUID()
  exerciseId: string

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  reps?: number

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number
}
