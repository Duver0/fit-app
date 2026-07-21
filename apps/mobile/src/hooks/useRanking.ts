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
  })

  const { data: myPerfData } = useQuery(MY_PERFORMANCE_QUERY, {
    variables: { exerciseId },
  })

  const [upsertMutation, { loading: upsertLoading }] = useMutation(UPSERT_PERFORMANCE_MUTATION, {
    refetchQueries: [{ query: RANKING_QUERY, variables: { exerciseId, page: 1, limit: 20 } }],
  })

  const [disputeMutation] = useMutation(CREATE_DISPUTE_MUTATION)

  const upsertPerformance = async (value: number) => {
    return upsertMutation({ variables: { input: { exerciseId, value } } })
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
