import { useSubscription, useApolloClient } from '@apollo/client'
import { DISPUTE_EVENT_SUBSCRIPTION, DISPUTES_QUERY, MY_DISPUTES_QUERY, RANKING_QUERY } from '../lib/graphql'

/**
 * Subscribes to dispute events (created/voted/resolved/cancelled) for a specific group.
 * When disputes change, relevant queries are refetched.
 */
export function useDisputeSubscription(groupId: string | null) {
  const client = useApolloClient()

  const { data, loading, error } = useSubscription(DISPUTE_EVENT_SUBSCRIPTION, {
    variables: { groupId: groupId || '' },
    skip: !groupId,
    onData: ({ data: subscriptionData }) => {
      const event = subscriptionData?.data?.disputeEvent
      if (!event) return

      // Refetch disputes and rankings (since resolution affects performance records)
      client.refetchQueries({
        include: [DISPUTES_QUERY, MY_DISPUTES_QUERY, RANKING_QUERY],
      })
    },
  })

  return { data: data?.disputeEvent, loading, error }
}
