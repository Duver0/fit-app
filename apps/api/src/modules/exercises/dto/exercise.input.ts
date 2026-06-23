import { InputType, Field } from '@nestjs/graphql'

@InputType()
export class CreateExerciseInput {
  @Field()
  groupId: string

  @Field()
  name: string

  @Field({ nullable: true })
  unit?: string
}
