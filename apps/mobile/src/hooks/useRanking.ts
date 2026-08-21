import { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useIsFocused } from '@react-navigation/native'
import {
  RANKING_QUERY,
  MY_PERFORMANCE_QUERY,
  UPSERT_PERFORMANCE_MUTATION,
  CREATE_DISPUTE_MUTATION,
} from '../lib/graphql'

export function useRanking(exerciseId: string) {
  const isFocused = useIsFocused()

  const rankingQuery = useQuery(RANKING_QUERY, {
    variables: { exerciseId, page: 1, limit: 100 },
  })

  useEffect(() => {
    if (isFocused) {
      rankingQuery.startPolling?.(30_000)
    } else {
      rankingQuery.stopPolling?.()
    }
    return () => { rankingQuery.stopPolling?.() }
  }, [isFocused, rankingQuery])

  const { data: myPerfData, loading: myPerfLoading } = useQuery(MY_PERFORMANCE_QUERY, {
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
    ranking: rankingQuery.data?.ranking?.items || [],
    totalCount: rankingQuery.data?.ranking?.totalCount || 0,
    totalPages: rankingQuery.data?.ranking?.totalPages || 0,
    myPerformance: myPerfData?.myPerformance || null,
    rawRanking: rankingQuery.data?.ranking ?? null,
    rawMyPerformance: myPerfData?.myPerformance ?? null,
    isLoading: rankingQuery.loading,
    isMyPerformanceLoading: myPerfLoading,
    isUpserting: upsertLoading,
    error: rankingQuery.error,
    refetch: rankingQuery.refetch,
    upsertPerformance,
    createDispute,
  }
}
