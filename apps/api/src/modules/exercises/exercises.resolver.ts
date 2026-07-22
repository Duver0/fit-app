import { Resolver, Query, Mutation, Args, Int, ResolveField, Parent } from '@nestjs/graphql'
import { UseGuards, Logger } from '@nestjs/common'
import { ExercisesService } from './exercises.service'
import { WgerService } from './wger.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Exercise } from '../../common/models'
import { WgerSearchResult } from '../../common/models/wger.model'
import { CreateExerciseInput, UpdateExerciseImageInput, UpdateExerciseInput, WgerDataInput } from './dto/exercise.input'
import { User } from '../../common/models'

/** Parsea un string JSON a arreglo, o devuelve undefined */
function parseJsonArray(value?: string | null): string[] | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

@Resolver(() => Exercise)
@UseGuards(GqlAuthGuard)
export class ExerciseFieldsResolver {
  @ResolveField(() => [String], { nullable: true })
  wgerMuscles(@Parent() exercise: any): string[] | undefined {
    return parseJsonArray(exercise.wgerMuscles)
  }

  @ResolveField(() => [String], { nullable: true })
  wgerEquipment(@Parent() exercise: any): string[] | undefined {
    return parseJsonArray(exercise.wgerEquipment)
  }
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class ExercisesResolver {
  private readonly logger = new Logger(ExercisesResolver.name)

  constructor(
    private exercisesService: ExercisesService,
    private wgerService: WgerService,
  ) {}

  @Query(() => [Exercise])
  async exercises(@Args('groupId') groupId: string) {
    return this.exercisesService.findByGroup(groupId)
  }

  @Query(() => Exercise)
  async exercise(@Args('id') id: string) {
    return this.exercisesService.findById(id)
  }

  @Query(() => WgerSearchResult)
  async searchExercises(
    @Args('name') name: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number,
  ) {
    return this.wgerService.searchByName(name, limit ?? 20, offset ?? 0)
  }

  @Mutation(() => Exercise)
  async changeExerciseCategory(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('categoryId', { type: () => String, nullable: true }) categoryId?: string | null,
  ) {
    return this.exercisesService.changeCategory(id, user.id, categoryId ?? null)
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

  @Mutation(() => Exercise)
  async updateExercise(
    @CurrentUser() user: User,
    @Args('input') input: UpdateExerciseInput,
  ) {
    return this.exercisesService.update(input.id, user.id, {
      name: input.name,
      imageUrl: input.imageUrl,
      categoryId: input.categoryId,
    })
  }

  @Mutation(() => Exercise)
  async enrichExercise(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('wgerData') wgerData: WgerDataInput,
  ) {
    return this.exercisesService.enrichFromWger(id, user.id, wgerData)
  }

  @Mutation(() => Boolean)
  async deleteExercise(@CurrentUser() user: User, @Args('id') id: string) {
    this.logger.log(`→ deleteExercise mutation | id="${id}" | user="${user.id}" | user.auth0Id="${user.auth0Id}"`)
    try {
      const result = await this.exercisesService.delete(id, user.id)
      this.logger.log(`✓ deleteExercise success | id="${id}" | result=${result}`)
      return result
    } catch (error: any) {
      this.logger.error(`✕ deleteExercise failed | id="${id}" | error="${error.message}"`, error.stack)
      throw error
    }
  }
}
