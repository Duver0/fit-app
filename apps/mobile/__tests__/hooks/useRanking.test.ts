import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react-hooks'

// Mock Apollo Client — must be before any subject imports
vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  gql: vi.fn(() => 'mocked_gql'),
}))

import { useQuery, useMutation } from '@apollo/client'
import { useRanking } from '../../src/hooks/useRanking'

const mockRankingItems = [
  { id: 'perf-1', value: 120, rank: 1, user: { id: 'user-1', name: 'Alice', avatarUrl: null } },
  { id: 'perf-2', value: 100, rank: 2, user: { id: 'user-2', name: 'Bob', avatarUrl: null } },
  { id: 'perf-3', value: 90, rank: 3, user: { id: 'user-3', name: 'Charlie', avatarUrl: 'https://example.com/avatar.png' } },
]

const mockRankingData = {
  ranking: {
    items: mockRankingItems,
    totalCount: 3,
    totalPages: 1,
    currentPage: 1,
  },
}

const mockMyPerformance = {
  id: 'perf-mine',
  value: 110,
  recordedAt: '2024-06-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
}

const EXERCISE_ID = 'exercise-1'

describe('useRanking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('query states', () => {
    it('should return ranking items from query', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: mockMyPerformance },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      expect(result.current.ranking).toEqual(mockRankingItems)
      expect(result.current.ranking).toHaveLength(3)
      expect(result.current.totalCount).toBe(3)
      expect(result.current.totalPages).toBe(1)
    })

    it('should return myPerformance when available', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: mockMyPerformance },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      expect(result.current.myPerformance).toEqual(mockMyPerformance)
    })

    it('should return null myPerformance when not present', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: null },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      expect(result.current.myPerformance).toBeNull()
    })

    it('should return loading state', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: null,
          loading: true,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: null,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      expect(result.current.isLoading).toBe(true)
    })

    it('should return error state', () => {
      const testError = new Error('Failed to fetch ranking')
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: null,
          loading: false,
          error: testError,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: null,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      expect(result.current.error).toBe(testError)
    })

    it('should call useQuery with correct variables', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: mockMyPerformance },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      renderHook(() => useRanking(EXERCISE_ID))

      // First call is for RANKING_QUERY
      expect(vi.mocked(useQuery).mock.calls[0][1]).toMatchObject({
        variables: { exerciseId: EXERCISE_ID, page: 1, limit: 20 },
      })

      // Second call is for MY_PERFORMANCE_QUERY
      expect(vi.mocked(useQuery).mock.calls[1][1]).toMatchObject({
        variables: { exerciseId: EXERCISE_ID },
      })
    })

    it('should return empty array when ranking data is null', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: { ranking: null },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: null },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      expect(result.current.ranking).toEqual([])
      expect(result.current.totalCount).toBe(0)
      expect(result.current.totalPages).toBe(0)
    })
  })

  describe('upsertPerformance', () => {
    it('should call upsert mutation with exerciseId and value', async () => {
      const mockUpsertMutation = vi.fn().mockResolvedValue({
        data: { upsertPerformance: { id: 'new-perf', value: 130 } },
      })
      const mockDisputeMutation = vi.fn()

      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: mockMyPerformance },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockUpsertMutation, { loading: false }])
        .mockReturnValueOnce([mockDisputeMutation, { loading: false }])

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      await act(async () => {
        await result.current.upsertPerformance(130)
      })

      expect(mockUpsertMutation).toHaveBeenCalledTimes(1)
      expect(mockUpsertMutation).toHaveBeenCalledWith({
        variables: { input: { exerciseId: EXERCISE_ID, value: 130 } },
      })
    })

    it('should reflect isUpserting state', () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: mockMyPerformance },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([vi.fn(), { loading: true }])
        .mockReturnValueOnce([vi.fn(), { loading: false }])

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      expect(result.current.isUpserting).toBe(true)
    })
  })

  describe('createDispute', () => {
    it('should call dispute mutation with performanceId and reason', async () => {
      const mockUpsertMutation = vi.fn()
      const mockDisputeMutation = vi.fn().mockResolvedValue({
        data: { createDispute: { id: 'dispute-1', status: 'PENDING', reason: 'Wrong value', expiresAt: '2024-07-01T00:00:00Z' } },
      })

      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: mockMyPerformance },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockUpsertMutation, { loading: false }])
        .mockReturnValueOnce([mockDisputeMutation, { loading: false }])

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      await act(async () => {
        await result.current.createDispute('perf-1', 'Incorrect value')
      })

      expect(mockDisputeMutation).toHaveBeenCalledTimes(1)
      expect(mockDisputeMutation).toHaveBeenCalledWith({
        variables: { input: { performanceId: 'perf-1', reason: 'Incorrect value' } },
      })
    })
  })

  describe('refetch', () => {
    it('should call refetch from ranking query', () => {
      const refetchFn = vi.fn()

      vi.mocked(useQuery)
        .mockReturnValueOnce({
          data: mockRankingData,
          loading: false,
          error: null,
          refetch: refetchFn,
        } as any)
        .mockReturnValueOnce({
          data: { myPerformance: mockMyPerformance },
          loading: false,
          error: null,
          refetch: vi.fn(),
        } as any)

      const { result } = renderHook(() => useRanking(EXERCISE_ID))

      result.current.refetch()

      expect(refetchFn).toHaveBeenCalledTimes(1)
    })
  })
})
