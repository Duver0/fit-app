import { useSubscription, useApolloClient } from '@apollo/client'
import { RANKING_CHANGED_SUBSCRIPTION, RANKING_QUERY } from '../lib/graphql'

/**
 * Subscribes to ranking changes for a specific exercise.
 * When rankings change, the ranking query is refetched.
 */
export function useRankingSubscription(exerciseId: string | null, groupId: string | null) {
  const client = useApolloClient()

  const { data, loading, error } = useSubscription(RANKING_CHANGED_SUBSCRIPTION, {
    variables: {
      exerciseId: exerciseId || '',
      groupId: groupId || '',
    },
    skip: !exerciseId || !groupId,
    onData: ({ data: subscriptionData }) => {
      const event = subscriptionData?.data?.rankingChanged
      if (!event) return

      // Refetch the ranking for this exercise
      client.refetchQueries({
        include: [RANKING_QUERY],
      })
    },
  })

  return { data: data?.rankingChanged, loading, error }
}
