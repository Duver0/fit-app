import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { ExerciseCategoriesService } from './exercise-categories.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ExerciseCategory } from '../../common/models'
import { User } from '../../common/models'
import { CreateExerciseCategoryInput, UpdateExerciseCategoryInput } from './dto/exercise-category.input'

@Resolver()
@UseGuards(GqlAuthGuard)
export class ExerciseCategoriesResolver {
  constructor(private categoriesService: ExerciseCategoriesService) {}

  @Query(() => [ExerciseCategory])
  async exerciseCategories(@Args('groupId') groupId: string) {
    return this.categoriesService.findByGroup(groupId)
  }

  @Query(() => ExerciseCategory)
  async exerciseCategory(@Args('id') id: string) {
    return this.categoriesService.findById(id)
  }

  @Mutation(() => ExerciseCategory)
  async createExerciseCategory(
    @CurrentUser() user: User,
    @Args('input') input: CreateExerciseCategoryInput,
  ) {
    return this.categoriesService.create(user.id, input)
  }

  @Mutation(() => ExerciseCategory)
  async updateExerciseCategory(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateExerciseCategoryInput,
  ) {
    return this.categoriesService.update(id, user.id, input)
  }

  @Mutation(() => Boolean)
  async deleteExerciseCategory(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ) {
    return this.categoriesService.delete(id, user.id)
  }
}
