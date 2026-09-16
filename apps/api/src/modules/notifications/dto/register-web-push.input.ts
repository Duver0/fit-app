import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class WebPushKeysInput {
  @Field()
  p256dh: string

  @Field()
  auth: string
}

@InputType()
export class RegisterWebPushSubscriptionInput {
  @Field()
  endpoint: string

  @Field(() => WebPushKeysInput)
  keys: WebPushKeysInput
}
