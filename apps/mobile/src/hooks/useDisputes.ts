import { useQuery, useMutation } from '@apollo/client'
import { DISPUTES_QUERY, VOTE_DISPUTE_MUTATION } from '../lib/graphql'

export function useDisputes(performanceId: string) {
  const { data, loading, error, refetch } = useQuery(DISPUTES_QUERY, {
    variables: { performanceId },
    skip: !performanceId,
    pollInterval: 10000,
  })

  const [voteMutation, { loading: isVoting }] = useMutation(VOTE_DISPUTE_MUTATION, {
    refetchQueries: [{ query: DISPUTES_QUERY, variables: { performanceId } }],
  })

  const vote = async (disputeId: string, vote: boolean) => {
    return voteMutation({ variables: { disputeId, vote } })
  }

  return {
    disputes: data?.disputes || [],
    isLoading: loading,
    isVoting,
    error,
    refetch,
    vote,
  }
}
