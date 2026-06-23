import { Resolver, Mutation, Query, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { InvitationsService } from './invitations.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Invitation } from '../../common/models'
import { User } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class InvitationsResolver {
  constructor(private invitationsService: InvitationsService) {}

  @Mutation(() => Invitation)
  async inviteToGroup(
    @CurrentUser() user: User,
    @Args('groupId') groupId: string,
    @Args('inviteeEmail') inviteeEmail: string,
  ) {
    return this.invitationsService.invite(groupId, inviteeEmail, user.id)
  }

  @Mutation(() => Boolean)
  async acceptInvitation(
    @CurrentUser() user: User,
    @Args('invitationId') invitationId: string,
  ) {
    return this.invitationsService.accept(invitationId, user.id)
  }

  @Mutation(() => Boolean)
  async declineInvitation(@Args('invitationId') invitationId: string) {
    return this.invitationsService.decline(invitationId)
  }

  @Query(() => [Invitation])
  async myInvitations(@CurrentUser() user: User) {
    return this.invitationsService.findByUser(user.id)
  }
}
