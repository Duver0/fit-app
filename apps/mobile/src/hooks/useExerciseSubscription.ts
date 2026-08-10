import { useSubscription, useApolloClient } from '@apollo/client'
import { EXERCISE_EVENT_SUBSCRIPTION, EXERCISES_QUERY, GROUP_QUERY } from '../lib/graphql'

/**
 * Subscribes to exercise events (created/updated/deleted) for a specific group.
 * When exercises change, the exercises list is refetched.
 */
export function useExerciseSubscription(groupId: string | null) {
  const client = useApolloClient()

  const { data, loading, error } = useSubscription(EXERCISE_EVENT_SUBSCRIPTION, {
    variables: { groupId: groupId || '' },
    skip: !groupId,
    onData: ({ data: subscriptionData }) => {
      const event = subscriptionData?.data?.exerciseEvent
      if (!event) return

      // Refetch exercises for this group
      client.refetchQueries({
        include: [EXERCISES_QUERY, GROUP_QUERY],
      })
    },
  })

  return { data: data?.exerciseEvent, loading, error }
}
