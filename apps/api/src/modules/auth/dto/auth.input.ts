import { InputType, Field } from '@nestjs/graphql'
import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator'

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  email: string

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string

  @Field()
  @IsString()
  @MinLength(1)
  password: string
}
