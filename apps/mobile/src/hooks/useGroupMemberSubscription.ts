import { useSubscription, useApolloClient } from '@apollo/client'
import { GROUP_MEMBER_EVENT_SUBSCRIPTION, MY_GROUPS_QUERY, GROUP_QUERY } from '../lib/graphql'

/**
 * Subscribes to group member events (join/leave/remove) for a specific group.
 * When members change, group data is refetched.
 */
export function useGroupMemberSubscription(groupId: string | null) {
  const client = useApolloClient()

  const { data, loading, error } = useSubscription(GROUP_MEMBER_EVENT_SUBSCRIPTION, {
    variables: { groupId: groupId || '' },
    skip: !groupId,
    onData: ({ data: subscriptionData }) => {
      const event = subscriptionData?.data?.groupMemberEvent
      if (!event) return

      // Refetch group data and groups list
      client.refetchQueries({
        include: [MY_GROUPS_QUERY, GROUP_QUERY],
      })
    },
  })

  return { data: data?.groupMemberEvent, loading, error }
}
