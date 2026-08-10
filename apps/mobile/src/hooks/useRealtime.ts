import { useQuery } from '@apollo/client'
import { MY_GROUPS_QUERY } from '../lib/graphql'
import { useAuthStore } from '../stores/authStore'
import { useInvitationSubscription } from './useInvitationSubscription'
import { usePerformanceSubscription } from './usePerformanceSubscription'
import { useGroupMemberSubscription } from './useGroupMemberSubscription'
import { useExerciseSubscription } from './useExerciseSubscription'
import { useDisputeSubscription } from './useDisputeSubscription'

/**
 * Subscribes to all real-time events for a single group.
 * Render one instance per group the user belongs to.
 */
function GroupSubscriptions({ groupId }: { groupId: string }) {
  usePerformanceSubscription(groupId)
  useGroupMemberSubscription(groupId)
  useExerciseSubscription(groupId)
  useDisputeSubscription(groupId)
  return null
}

/**
 * Master hook that orchestrates all real-time subscriptions.
 * Mount this at the root layout level to enable real-time updates.
 *
 * IMPORTANT: We use a component-per-group pattern instead of calling
 * hooks in a loop, because React hooks must be called in the same
 * order every render (Rules of Hooks).
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

  return {
    isConnected: isAuthenticated,
    groupCount: groupIds.length,
    groupIds,
    GroupSubscriptions,
  }
}
