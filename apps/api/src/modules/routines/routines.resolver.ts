import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { RoutinesService } from './routines.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../../common/models/user.model'
import { RoutineDay } from '../../common/models/routine.model'

@Resolver()
@UseGuards(GqlAuthGuard)
export class RoutinesResolver {
  constructor(private routinesService: RoutinesService) {}

  @Mutation(() => User)
  async toggleRoutine(
    @CurrentUser() user: User,
    @Args('enabled') enabled: boolean,
  ) {
    return this.routinesService.toggleRoutine(user.id, enabled)
  }

  @Query(() => [RoutineDay])
  async myRoutineDays(@CurrentUser() user: User) {
    return this.routinesService.getRoutineDays(user.id)
  }

  @Query(() => RoutineDay, { nullable: true })
  async routineDay(
    @CurrentUser() user: User,
    @Args('dayOfWeek', { type: () => Int }) dayOfWeek: number,
  ) {
    return this.routinesService.getRoutineDay(user.id, dayOfWeek)
  }

  @Mutation(() => RoutineDay)
  async addExerciseToDay(
    @CurrentUser() user: User,
    @Args('dayOfWeek', { type: () => Int }) dayOfWeek: number,
    @Args('exerciseId') exerciseId: string,
  ) {
    return this.routinesService.addExerciseToDay(user.id, dayOfWeek, exerciseId)
  }

  @Mutation(() => RoutineDay)
  async removeExerciseFromDay(
    @CurrentUser() user: User,
    @Args('dayOfWeek', { type: () => Int }) dayOfWeek: number,
    @Args('exerciseId') exerciseId: string,
  ) {
    return this.routinesService.removeExerciseFromDay(user.id, dayOfWeek, exerciseId)
  }

  @Mutation(() => RoutineDay)
  async reorderExercises(
    @CurrentUser() user: User,
    @Args('dayOfWeek', { type: () => Int }) dayOfWeek: number,
    @Args('exerciseIds', { type: () => [String] }) exerciseIds: string[],
  ) {
    return this.routinesService.reorderExercises(user.id, dayOfWeek, exerciseIds)
  }
}
