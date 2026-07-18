import { InputType, Field } from '@nestjs/graphql'
import { IsUUID, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsUrl } from 'class-validator'
import { ExerciseUnit } from '@prisma/client'

@InputType()
export class UpdateExerciseImageInput {
  @Field()
  @IsUUID()
  id: string

  @Field()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl: string
}

@InputType()
export class UpdateExerciseInput {
  @Field()
  @IsUUID()
  id: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl?: string
}

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

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl?: string
}
