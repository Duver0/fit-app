import { ObjectType, Field, ID } from '@nestjs/graphql'

@ObjectType()
export class DeviceToken {
  @Field(() => ID)
  id: string

  @Field()
  userId: string

  @Field()
  token: string

  @Field()
  platform: string

  @Field()
  active: boolean

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}
