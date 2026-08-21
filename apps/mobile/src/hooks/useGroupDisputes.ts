import { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useIsFocused } from '@react-navigation/native'
import { GROUP_DISPUTES_QUERY } from '../lib/graphql'

/**
 * Polls disputes for a specific group (replaces the old `disputeEvent`
 * subscription). Uses focus-based polling to avoid background requests.
 */
export function useGroupDisputes(groupId: string | null) {
  const isFocused = useIsFocused()

  const groupDisputesQuery = useQuery(GROUP_DISPUTES_QUERY, {
    variables: { groupId: groupId || '' },
    skip: !groupId,
  })

  useEffect(() => {
    if (!groupId) return
    if (isFocused) {
      groupDisputesQuery.startPolling?.(20_000)
    } else {
      groupDisputesQuery.stopPolling?.()
    }
    return () => { groupDisputesQuery.stopPolling?.() }
  }, [isFocused, groupId, groupDisputesQuery])

  return {
    disputes: groupDisputesQuery.data?.groupDisputes || [],
    isLoading: groupDisputesQuery.loading,
    error: groupDisputesQuery.error,
    refetch: groupDisputesQuery.refetch,
  }
}
