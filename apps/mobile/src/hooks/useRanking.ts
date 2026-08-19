import { useQuery, useMutation } from '@apollo/client'
import {
  RANKING_QUERY,
  MY_PERFORMANCE_QUERY,
  UPSERT_PERFORMANCE_MUTATION,
  CREATE_DISPUTE_MUTATION,
} from '../lib/graphql'

export function useRanking(exerciseId: string) {
  const { data: rankingData, loading, error, refetch } = useQuery(RANKING_QUERY, {
    variables: { exerciseId, page: 1, limit: 100 },
    pollInterval: 8000,
  })

  const { data: myPerfData } = useQuery(MY_PERFORMANCE_QUERY, {
    variables: { exerciseId },
  })

  const [upsertMutation, { loading: upsertLoading }] = useMutation(UPSERT_PERFORMANCE_MUTATION, {
    refetchQueries: [{ query: RANKING_QUERY, variables: { exerciseId, page: 1, limit: 100 } }],
  })

  const [disputeMutation] = useMutation(CREATE_DISPUTE_MUTATION)

  const upsertPerformance = async (value: number, reps?: number, weight?: number) => {
    const input: any = { exerciseId }
    if (reps != null && weight != null) {
      input.reps = reps
      input.weight = weight
    } else {
      input.value = value
    }
    return upsertMutation({ variables: { input } })
  }

  const createDispute = async (performanceId: string, reason: string) => {
    return disputeMutation({ variables: { input: { performanceId, reason } } })
  }

  return {
    ranking: rankingData?.ranking?.items || [],
    totalCount: rankingData?.ranking?.totalCount || 0,
    totalPages: rankingData?.ranking?.totalPages || 0,
    myPerformance: myPerfData?.myPerformance || null,
    isLoading: loading,
    isUpserting: upsertLoading,
    error,
    refetch,
    upsertPerformance,
    createDispute,
  }
}
