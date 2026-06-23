import { Resolver, Mutation, Query, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { PerformanceService } from './performance.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PerformanceRecord } from '../../common/models'
import { UpsertPerformanceInput } from './dto/performance.input'
import { User } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class PerformanceResolver {
  constructor(private performanceService: PerformanceService) {}

  @Mutation(() => PerformanceRecord)
  async upsertPerformance(
    @CurrentUser() user: User,
    @Args('input') input: UpsertPerformanceInput,
  ) {
    return this.performanceService.upsert(user.id, input)
  }

  @Query(() => PerformanceRecord, { nullable: true })
  async myPerformance(
    @CurrentUser() user: User,
    @Args('exerciseId') exerciseId: string,
  ) {
    return this.performanceService.findByUserAndExercise(user.id, exerciseId)
  }
}
