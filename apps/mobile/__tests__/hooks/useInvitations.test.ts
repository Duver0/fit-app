import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react-hooks'

// Mock Apollo Client — must be before any subject imports
vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  gql: vi.fn(() => 'mocked_gql'),
}))

import { useQuery, useMutation } from '@apollo/client'
import { useInvitations } from '../../src/hooks/useInvitations'

const mockInvitations = [
  {
    id: 'inv-1',
    status: 'PENDING',
    inviteeEmail: 'user@example.com',
    group: { id: 'group-1', name: 'Gym Buddies', avatarUrl: null },
    inviter: { id: 'user-1', name: 'Alice' },
  },
  {
    id: 'inv-2',
    status: 'PENDING',
    inviteeEmail: 'other@example.com',
    group: { id: 'group-2', name: 'Fitness Freaks', avatarUrl: 'https://example.com/group.png' },
    inviter: { id: 'user-2', name: 'Bob' },
  },
]

describe('useInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('query states', () => {
    it('should return invitations from query', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useInvitations())

      expect(result.current.invitations).toEqual(mockInvitations)
      expect(result.current.invitations).toHaveLength(2)
    })

    it('should return empty array when no invitations', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: null },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useInvitations())

      expect(result.current.invitations).toEqual([])
    })

    it('should return loading state', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useInvitations())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.invitations).toEqual([])
    })

    it('should return error state', () => {
      const testError = new Error('Failed to fetch invitations')
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        loading: false,
        error: testError,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useInvitations())

      expect(result.current.error).toBe(testError)
    })

    it('should return refetch function', () => {
      const refetchFn = vi.fn()
      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: refetchFn,
      } as any)

      const { result } = renderHook(() => useInvitations())

      result.current.refetch()
      expect(refetchFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('accept', () => {
    it('should call accept mutation with invitationId', async () => {
      const mockAcceptMutation = vi.fn().mockResolvedValue({
        data: { acceptInvitation: true },
      })
      const mockDeclineMutation = vi.fn()

      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockAcceptMutation, { loading: false }])
        .mockReturnValueOnce([mockDeclineMutation, { loading: false }])

      const { result } = renderHook(() => useInvitations())

      await act(async () => {
        await result.current.accept('inv-1')
      })

      expect(mockAcceptMutation).toHaveBeenCalledTimes(1)
      expect(mockAcceptMutation).toHaveBeenCalledWith({
        variables: { invitationId: 'inv-1' },
      })
    })

    it('should return the mutation result', async () => {
      const mutationResponse = { data: { acceptInvitation: true } }
      const mockAcceptMutation = vi.fn().mockResolvedValue(mutationResponse)
      const mockDeclineMutation = vi.fn()

      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockAcceptMutation, { loading: false }])
        .mockReturnValueOnce([mockDeclineMutation, { loading: false }])

      const { result } = renderHook(() => useInvitations())

      let response: any
      await act(async () => {
        response = await result.current.accept('inv-1')
      })

      expect(response).toEqual(mutationResponse)
    })

    it('should reflect isAccepting state', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([vi.fn(), { loading: true }])
        .mockReturnValueOnce([vi.fn(), { loading: false }])

      const { result } = renderHook(() => useInvitations())

      expect(result.current.isAccepting).toBe(true)
    })

    it('should propagate mutation errors', async () => {
      const mockAcceptMutation = vi.fn().mockRejectedValue(new Error('Invitation expired'))
      const mockDeclineMutation = vi.fn()

      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockAcceptMutation, { loading: false }])
        .mockReturnValueOnce([mockDeclineMutation, { loading: false }])

      const { result } = renderHook(() => useInvitations())

      await expect(
        act(async () => {
          await result.current.accept('inv-expired')
        }),
      ).rejects.toThrow('Invitation expired')
    })
  })

  describe('decline', () => {
    it('should call decline mutation with invitationId', async () => {
      const mockAcceptMutation = vi.fn()
      const mockDeclineMutation = vi.fn().mockResolvedValue({
        data: { declineInvitation: true },
      })

      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockAcceptMutation, { loading: false }])
        .mockReturnValueOnce([mockDeclineMutation, { loading: false }])

      const { result } = renderHook(() => useInvitations())

      await act(async () => {
        await result.current.decline('inv-2')
      })

      expect(mockDeclineMutation).toHaveBeenCalledTimes(1)
      expect(mockDeclineMutation).toHaveBeenCalledWith({
        variables: { invitationId: 'inv-2' },
      })
    })

    it('should return the mutation result', async () => {
      const mutationResponse = { data: { declineInvitation: true } }
      const mockAcceptMutation = vi.fn()
      const mockDeclineMutation = vi.fn().mockResolvedValue(mutationResponse)

      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockAcceptMutation, { loading: false }])
        .mockReturnValueOnce([mockDeclineMutation, { loading: false }])

      const { result } = renderHook(() => useInvitations())

      let response: any
      await act(async () => {
        response = await result.current.decline('inv-2')
      })

      expect(response).toEqual(mutationResponse)
    })

    it('should reflect isDeclining state', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { myInvitations: mockInvitations },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation)
        .mockReturnValueOnce([vi.fn(), { loading: false }])
        .mockReturnValueOnce([vi.fn(), { loading: true }])

      const { result } = renderHook(() => useInvitations())

      expect(result.current.isDeclining).toBe(true)
    })
  })
})
