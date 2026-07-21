import { ObjectType, Field, Int } from '@nestjs/graphql'

@ObjectType()
export class ProviderDiagResult {
  @Field()
  provider: string

  @Field()
  configured: boolean

  @Field()
  success: boolean

  @Field(() => Int)
  count: number

  @Field({ nullable: true })
  error?: string

  @Field({ nullable: true })
  firstImageThumbnail?: string
}
