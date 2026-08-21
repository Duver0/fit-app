import { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useIsFocused } from '@react-navigation/native'
import { DISPUTES_QUERY, VOTE_DISPUTE_MUTATION } from '../lib/graphql'

export function useDisputes(performanceId: string) {
  const isFocused = useIsFocused()

  const disputesQuery = useQuery(DISPUTES_QUERY, {
    variables: { performanceId },
    skip: !performanceId,
  })

  useEffect(() => {
    if (!performanceId) return
    if (isFocused) {
      disputesQuery.startPolling?.(20_000)
    } else {
      disputesQuery.stopPolling?.()
    }
    return () => { disputesQuery.stopPolling?.() }
  }, [isFocused, performanceId, disputesQuery])

  const [voteMutation, { loading: isVoting }] = useMutation(VOTE_DISPUTE_MUTATION, {
    refetchQueries: [{ query: DISPUTES_QUERY, variables: { performanceId } }],
  })

  const vote = async (disputeId: string, vote: boolean) => {
    return voteMutation({ variables: { disputeId, vote } })
  }

  return {
    disputes: disputesQuery.data?.disputes || [],
    isLoading: disputesQuery.loading,
    isVoting,
    error: disputesQuery.error,
    refetch: disputesQuery.refetch,
    vote,
  }
}
