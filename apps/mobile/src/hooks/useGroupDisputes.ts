import { useQuery } from '@apollo/client'
import { GROUP_DISPUTES_QUERY } from '../lib/graphql'

/**
 * Polls disputes for a specific group (replaces the old `disputeEvent`
 * subscription). Refreshes every 10s via `pollInterval`.
 */
export function useGroupDisputes(groupId: string | null) {
  const { data, loading, error, refetch } = useQuery(GROUP_DISPUTES_QUERY, {
    variables: { groupId: groupId || '' },
    skip: !groupId,
    pollInterval: 10000,
  })

  return {
    disputes: data?.groupDisputes || [],
    isLoading: loading,
    error,
    refetch,
  }
}
