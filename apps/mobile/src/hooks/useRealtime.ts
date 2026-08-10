import { useQuery } from '@apollo/client'
import { MY_GROUPS_QUERY } from '../lib/graphql'
import { useAuthStore } from '../stores/authStore'
import { useInvitationSubscription } from './useInvitationSubscription'
import { usePerformanceSubscription } from './usePerformanceSubscription'
import { useGroupMemberSubscription } from './useGroupMemberSubscription'
import { useExerciseSubscription } from './useExerciseSubscription'
import { useDisputeSubscription } from './useDisputeSubscription'

/**
 * Master hook that orchestrates all real-time subscriptions.
 * Mount this at the root layout level to enable real-time updates.
 *
 * Subscriptions:
 * - Invitation received (user-level, always active when authenticated)
 * - Performance updated (per group)
 * - Group member events (per group)
 * - Exercise events (per group)
 * - Dispute events (per group)
 *
 * All group-level subscriptions are automatically managed based on
 * the user's group memberships.
 */
export function useRealtime() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Fetch user's groups to know which group topics to subscribe to
  const { data: groupsData } = useQuery(MY_GROUPS_QUERY, {
    skip: !isAuthenticated,
  })

  const groupIds: string[] = groupsData?.myGroups?.map((g: any) => g.id) || []

  // --- User-level subscriptions (always active) ---
  useInvitationSubscription()

  // --- Group-level subscriptions (per group) ---
  // Note: In a production app, we might want to limit the number of
  // concurrent subscriptions. For now, we subscribe to all groups.
  groupIds.forEach((groupId: string) => {
    usePerformanceSubscription(groupId)
    useGroupMemberSubscription(groupId)
    useExerciseSubscription(groupId)
    useDisputeSubscription(groupId)
  })

  return {
    isConnected: isAuthenticated,
    groupCount: groupIds.length,
  }
}
