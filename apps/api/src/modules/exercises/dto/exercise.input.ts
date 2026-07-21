import { InputType, Field, Int } from '@nestjs/graphql'
import { IsUUID, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsUrl, IsInt, IsArray } from 'class-validator'
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
export class WgerDataInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl?: string

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  wgerId?: number

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  wgerCategory?: string

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wgerMuscles?: string[]

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wgerEquipment?: string[]

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  wgerInstructions?: string
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

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string
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
  @IsUUID()
  categoryId?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  imageUrl?: string
}
