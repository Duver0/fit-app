import { InputType, Field, Int } from '@nestjs/graphql'

@InputType()
export class AddExerciseInput {
  @Field(() => Int)
  dayOfWeek: number

  @Field()
  exerciseId: string
}

@InputType()
export class ReorderInput {
  @Field(() => Int)
  dayOfWeek: number

  @Field(() => [String])
  exerciseIds: string[]
}
