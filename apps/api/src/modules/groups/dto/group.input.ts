import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class CreateGroupInput {
  @Field()
  name: string

  @Field({ nullable: true })
  description?: string
}

@InputType()
export class UpdateGroupInput {
  @Field({ nullable: true })
  name?: string

  @Field({ nullable: true })
  description?: string

  @Field({ nullable: true })
  avatarUrl?: string
}
