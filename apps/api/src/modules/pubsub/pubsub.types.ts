// ---------------------------------------------------------------------------
// Event type definitions for the PubSub system
// Each event corresponds to a domain mutation that should notify subscribers
// ---------------------------------------------------------------------------

export interface PerformanceUpdatedEvent {
  performanceId: string
  exerciseId: string
  groupId: string
  userId: string // actor who triggered the event
}

export interface RankingChangedEvent {
  exerciseId: string
  groupId: string
}

export interface InvitationReceivedEvent {
  invitationId: string
  inviteeUserId: string
  groupId: string
}

export interface DisputeEvent {
  disputeId: string
  groupId: string
  actorId: string
  type: 'CREATED' | 'VOTE_CAST' | 'RESOLVED' | 'CANCELLED'
}

export interface GroupMemberEvent {
  groupId: string
  userId: string // the member who joined/left
  actorId: string // who triggered it
  type: 'JOINED' | 'LEFT' | 'REMOVED'
}

export interface ExerciseEvent {
  exerciseId: string
  groupId: string
  actorId: string
  type: 'CREATED' | 'UPDATED' | 'DELETED'
}

// Map of event names to their payload types
export interface PubSubEventMap {
  performanceUpdated: PerformanceUpdatedEvent
  rankingChanged: RankingChangedEvent
  invitationReceived: InvitationReceivedEvent
  disputeEvent: DisputeEvent
  groupMemberEvent: GroupMemberEvent
  exerciseEvent: ExerciseEvent
}

export type PubSubEventName = keyof PubSubEventMap
