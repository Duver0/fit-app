import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql'
import { User } from './user.model'
import { Exercise } from './exercise.model'
import { Group } from './group.model'
import { PerformanceRecord } from './performance.model'
import { Dispute } from './dispute.model'
import { Invitation } from './invitation.model'

// ---------------------------------------------------------------------------
// Subscription event types
// ---------------------------------------------------------------------------

export enum GroupMemberEventType {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  REMOVED = 'REMOVED',
}

export enum ExerciseEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}

export enum DisputeEventType {
  CREATED = 'CREATED',
  VOTE_CAST = 'VOTE_CAST',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(GroupMemberEventType, { name: 'GroupMemberEventType' })
registerEnumType(ExerciseEventType, { name: 'ExerciseEventType' })
registerEnumType(DisputeEventType, { name: 'DisputeEventType' })

// --- Performance Updated ---

@ObjectType()
export class PerformanceUpdatedPayload {
  @Field(() => PerformanceRecord)
  performance: PerformanceRecord

  @Field()
  exerciseId: string

  @Field()
  groupId: string

  @Field()
  userId: string
}

// --- Ranking Changed ---

@ObjectType()
export class RankingChangedPayload {
  @Field()
  exerciseId: string

  @Field()
  groupId: string
}

// --- Invitation Received ---

@ObjectType()
export class InvitationReceivedPayload {
  @Field(() => Invitation)
  invitation: Invitation

  @Field()
  inviteeUserId: string

  @Field()
  groupId: string
}

// --- Group Member Event ---

@ObjectType()
export class GroupMemberEventPayload {
  @Field()
  groupId: string

  @Field()
  userId: string

  @Field()
  actorId: string

  @Field(() => GroupMemberEventType)
  type: GroupMemberEventType
}

// --- Exercise Event ---

@ObjectType()
export class ExerciseEventPayload {
  @Field({ nullable: true })
  exerciseId: string

  @Field()
  groupId: string

  @Field()
  actorId: string

  @Field(() => ExerciseEventType)
  type: ExerciseEventType

  @Field(() => Exercise, { nullable: true })
  exercise?: Exercise
}

// --- Dispute Event ---

@ObjectType()
export class DisputeEventPayload {
  @Field()
  disputeId: string

  @Field()
  groupId: string

  @Field()
  actorId: string

  @Field(() => DisputeEventType)
  type: DisputeEventType

  @Field(() => Dispute, { nullable: true })
  dispute?: Dispute
}
