import { ObjectType, Field, ID } from '@nestjs/graphql'

@ObjectType()
export class UserSearchResult {
  @Field(() => ID)
  id: string

  @Field()
  name: string

  @Field()
  email: string

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null
}
