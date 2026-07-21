import { ObjectType, Field, Int } from '@nestjs/graphql'

@ObjectType()
export class GroupImage {
  @Field()
  id: string

  @Field()
  provider: string

  @Field()
  url: string

  @Field()
  thumbnail: string

  @Field()
  author: string

  @Field()
  attributionUrl: string

  @Field(() => Int, { nullable: true })
  width?: number

  @Field(() => Int, { nullable: true })
  height?: number
}
