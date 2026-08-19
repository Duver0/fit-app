import { useQuery } from '@apollo/client'
import { MY_DISPUTES_QUERY } from '../lib/graphql'

/**
 * Polls the current user's disputes (replaces the `disputeEvent`
 * subscription at the user level). Refreshes every 10s via `pollInterval`.
 */
export function useMyDisputes() {
  const { data, loading, error, refetch } = useQuery(MY_DISPUTES_QUERY, {
    pollInterval: 10000,
  })

  return {
    disputes: data?.myDisputes || [],
    isLoading: loading,
    error,
    refetch,
  }
}
