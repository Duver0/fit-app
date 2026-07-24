import { Resolver, Mutation, Query, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { DisputesService } from './disputes.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Dispute } from '../../common/models'
import { CreateDisputeInput, VoteDisputeInput, VoteOption } from './dto/dispute.input'
import { User } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class DisputesResolver {
  constructor(private disputesService: DisputesService) {}

  @Mutation(() => Dispute)
  async createDispute(
    @CurrentUser() user: User,
    @Args('input') input: CreateDisputeInput,
  ) {
    return this.disputesService.create(user.id, input)
  }

  @Mutation(() => Dispute)
  async voteDispute(
    @CurrentUser() user: User,
    @Args('input') input: VoteDisputeInput,
  ) {
    return this.disputesService.vote(user.id, input.disputeId, input.vote)
  }

  @Mutation(() => Dispute)
  async cancelDispute(
    @CurrentUser() user: User,
    @Args('disputeId') disputeId: string,
  ) {
    return this.disputesService.cancel(user.id, disputeId)
  }

  @Query(() => [Dispute])
  async disputes(@Args('performanceId') performanceId: string) {
    return this.disputesService.findByPerformance(performanceId)
  }

  @Query(() => [Dispute])
  async myDisputes(@CurrentUser() user: User) {
    return this.disputesService.findByUser(user.id)
  }
}
