import { InputType, Field } from '@nestjs/graphql'
import { IsUUID, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator'
import { ExerciseUnit } from '@prisma/client'

@InputType()
export class CreateExerciseInput {
  @Field()
  @IsUUID()
  groupId: string

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(ExerciseUnit)
  unit?: string
}
