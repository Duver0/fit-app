import { Resolver, Query, Args, Int } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { RankingService } from './ranking.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { RankingConnection, ExerciseRankingPreview } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class RankingResolver {
  constructor(private rankingService: RankingService) {}

  @Query(() => RankingConnection)
  async ranking(
    @Args('exerciseId') exerciseId: string,
    @Args('page', { nullable: true, type: () => Int }) page?: number,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
  ) {
    return this.rankingService.getRanking(exerciseId, page || 1, limit || 20)
  }

  @Query(() => [ExerciseRankingPreview])
  async top3Ranking(@Args('groupId') groupId: string) {
    return this.rankingService.getTop3(groupId)
  }
}
