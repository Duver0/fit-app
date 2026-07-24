import { Resolver, Query, Mutation, Args, Int, ResolveField, Parent } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { RoutinesService } from './routines.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../../common/models/user.model'
import { RoutineDay, RoutineExercise, ExerciseWithPerformance } from '../../common/models/routine.model'
import { Group } from '../../common/models/group.model'
import { PrismaService } from '../../prisma/prisma.service'

@Resolver(() => RoutineExercise)
@UseGuards(GqlAuthGuard)
export class RoutinesResolver {
  constructor(
    private routinesService: RoutinesService,
    private prisma: PrismaService,
  ) {}

  @ResolveField(() => Group, { nullable: true })
  group(@Parent() routineExercise: any): Group | null {
    // The exercise already includes group data from Prisma (included in routines.service)
    return routineExercise.exercise?.group || null
  }

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

  @Query(() => [ExerciseWithPerformance])
  async myExercisesForRoutine(@CurrentUser() user: User) {
    return this.routinesService.getExercisesForRoutine(user.id)
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
  async updateRoutineDayName(
    @CurrentUser() user: User,
    @Args('dayOfWeek', { type: () => Int }) dayOfWeek: number,
    @Args('name', { nullable: true }) name?: string,
  ) {
    await this.routinesService.updateDayName(user.id, dayOfWeek, name || null)
    return this.routinesService.getRoutineDay(user.id, dayOfWeek)
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
