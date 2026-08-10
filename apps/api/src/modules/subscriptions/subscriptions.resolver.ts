import { Resolver, Subscription, Args, ID } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { PubSubService } from '../pubsub/pubsub.service'
import { PrismaService } from '../../prisma/prisma.service'
import { SubscriptionAuthGuard } from './guards/subscription-auth.guard'
import {
  PerformanceUpdatedPayload,
  RankingChangedPayload,
  InvitationReceivedPayload,
  GroupMemberEventPayload,
  ExerciseEventPayload,
  DisputeEventPayload,
} from '../../common/models/subscription-payloads.model'

@Resolver()
@UseGuards(SubscriptionAuthGuard)
export class SubscriptionsResolver {
  constructor(
    private pubSub: PubSubService,
    private prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Performance Updated — fires when any user logs performance on an exercise
  // Subscribers: all active members of the group (except the actor)
  // ---------------------------------------------------------------------------
  @Subscription(() => PerformanceUpdatedPayload, {
    name: 'performanceUpdated',
    filter: (payload: any, variables: any, context: any) => {
      const event = payload.performanceUpdated
      const user = context.req?.user
      // Only send to group members, not the actor
      return event.groupId === variables.groupId && user && event.userId !== user.id
    },
  })
  onPerformanceUpdated(
    @Args('groupId', { type: () => ID }) groupId: string,
  ) {
    return this.pubSub.asyncIterator('performanceUpdated')
  }

  // ---------------------------------------------------------------------------
  // Ranking Changed — fires when a performance update affects rankings
  // Subscribers: all active members of the group (except the actor)
  // ---------------------------------------------------------------------------
  @Subscription(() => RankingChangedPayload, {
    name: 'rankingChanged',
    filter: (payload: any, variables: any, context: any) => {
      const event = payload.rankingChanged
      const user = context.req?.user
      return event.groupId === variables.groupId && user && event.exerciseId === variables.exerciseId
    },
  })
  onRankingChanged(
    @Args('exerciseId', { type: () => ID }) exerciseId: string,
    @Args('groupId', { type: () => ID }) groupId: string,
  ) {
    return this.pubSub.asyncIterator('rankingChanged')
  }

  // ---------------------------------------------------------------------------
  // Invitation Received — fires when someone invites the current user
  // Subscriber: only the invited user
  // ---------------------------------------------------------------------------
  @Subscription(() => InvitationReceivedPayload, {
    name: 'invitationReceived',
    filter: (payload: any, variables: any, context: any) => {
      const event = payload.invitationReceived
      const user = context.req?.user
      return user && event.inviteeUserId === user.id
    },
  })
  onInvitationReceived() {
    return this.pubSub.asyncIterator('invitationReceived')
  }

  // ---------------------------------------------------------------------------
  // Group Member Event — fires when someone joins/leaves/is removed
  // Subscribers: all active members of the group (except the actor)
  // ---------------------------------------------------------------------------
  @Subscription(() => GroupMemberEventPayload, {
    name: 'groupMemberEvent',
    filter: (payload: any, variables: any, context: any) => {
      const event = payload.groupMemberEvent
      const user = context.req?.user
      return event.groupId === variables.groupId && user && event.actorId !== user.id
    },
  })
  onGroupMemberEvent(
    @Args('groupId', { type: () => ID }) groupId: string,
  ) {
    return this.pubSub.asyncIterator('groupMemberEvent')
  }

  // ---------------------------------------------------------------------------
  // Exercise Event — fires when exercises are created/updated/deleted
  // Subscribers: all active members of the group (except the actor)
  // ---------------------------------------------------------------------------
  @Subscription(() => ExerciseEventPayload, {
    name: 'exerciseEvent',
    filter: (payload: any, variables: any, context: any) => {
      const event = payload.exerciseEvent
      const user = context.req?.user
      return event.groupId === variables.groupId && user && event.actorId !== user.id
    },
  })
  onExerciseEvent(
    @Args('groupId', { type: () => ID }) groupId: string,
  ) {
    return this.pubSub.asyncIterator('exerciseEvent')
  }

  // ---------------------------------------------------------------------------
  // Dispute Event — fires when disputes are created/voted/resolved
  // Subscribers: all active members of the group (except the actor)
  // ---------------------------------------------------------------------------
  @Subscription(() => DisputeEventPayload, {
    name: 'disputeEvent',
    filter: (payload: any, variables: any, context: any) => {
      const event = payload.disputeEvent
      const user = context.req?.user
      return event.groupId === variables.groupId && user && event.actorId !== user.id
    },
  })
  onDisputeEvent(
    @Args('groupId', { type: () => ID }) groupId: string,
  ) {
    return this.pubSub.asyncIterator('disputeEvent')
  }
}
