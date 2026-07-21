import { InputType, Field } from '@nestjs/graphql'
import { IsUUID, IsString, MinLength, MaxLength, IsOptional } from 'class-validator'

@InputType()
export class CreateExerciseCategoryInput {
  @Field()
  @IsUUID()
  groupId: string

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string
}

@InputType()
export class UpdateExerciseCategoryInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string
}
