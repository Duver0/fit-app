import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class RegisterDeviceTokenInput {
  @Field()
  token: string

  @Field()
  platform: string
}
