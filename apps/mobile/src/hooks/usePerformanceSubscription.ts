import { useEffect } from 'react'
import { useSubscription, useApolloClient } from '@apollo/client'
import { PERFORMANCE_UPDATED_SUBSCRIPTION, RANKING_QUERY, MY_GROUPS_QUERY } from '../lib/graphql'

/**
 * Subscribes to performance updates for a specific group.
 * When another user logs performance, the ranking query is refetched.
 */
export function usePerformanceSubscription(groupId: string | null) {
  const client = useApolloClient()

  const { data, loading, error } = useSubscription(PERFORMANCE_UPDATED_SUBSCRIPTION, {
    variables: { groupId: groupId || '' },
    skip: !groupId,
    onData: ({ data: subscriptionData }) => {
      const event = subscriptionData?.data?.performanceUpdated
      if (!event) return

      // Refetch rankings for the affected exercise to keep UI in sync
      client.refetchQueries({
        include: [RANKING_QUERY],
      })
    },
  })

  return { data: data?.performanceUpdated, loading, error }
}
