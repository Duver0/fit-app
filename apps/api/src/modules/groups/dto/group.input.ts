import { InputType, Field } from '@nestjs/graphql'
import { IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator'

@InputType()
export class CreateGroupInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}

@InputType()
export class UpdateGroupInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string
}
