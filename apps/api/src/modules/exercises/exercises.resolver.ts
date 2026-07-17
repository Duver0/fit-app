import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { ExercisesService } from './exercises.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Exercise } from '../../common/models'
import { CreateExerciseInput, UpdateExerciseImageInput } from './dto/exercise.input'
import { User } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class ExercisesResolver {
  constructor(private exercisesService: ExercisesService) {}

  @Query(() => [Exercise])
  async exercises(@Args('groupId') groupId: string) {
    return this.exercisesService.findByGroup(groupId)
  }

  @Query(() => Exercise)
  async exercise(@Args('id') id: string) {
    return this.exercisesService.findById(id)
  }

  @Mutation(() => Exercise)
  async createExercise(
    @CurrentUser() user: User,
    @Args('input') input: CreateExerciseInput,
  ) {
    return this.exercisesService.create(user.id, input)
  }

  @Mutation(() => Exercise)
  async updateExerciseImage(
    @CurrentUser() user: User,
    @Args('input') input: UpdateExerciseImageInput,
  ) {
    return this.exercisesService.updateImage(input.id, user.id, input.imageUrl)
  }

  @Mutation(() => Boolean)
  async deleteExercise(@CurrentUser() user: User, @Args('id') id: string) {
    return this.exercisesService.delete(id, user.id)
  }
}
