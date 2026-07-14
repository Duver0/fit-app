import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react-hooks'

// Mock Apollo Client — must be before any subject imports
vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  gql: vi.fn(() => 'mocked_gql'),
}))

import { useQuery, useMutation } from '@apollo/client'
import { useGroups } from '../../src/hooks/useGroups'

const mockGroups = [
  {
    id: 'group-1',
    name: 'Gym Buddies',
    description: 'A cool group',
    avatarUrl: null,
    memberCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    owner: { id: 'user-1', name: 'Owner', avatarUrl: null },
  },
  {
    id: 'group-2',
    name: 'Fitness Freaks',
    description: 'Another group',
    avatarUrl: 'https://example.com/avatar.png',
    memberCount: 3,
    createdAt: '2024-02-01T00:00:00Z',
    owner: { id: 'user-2', name: 'Owner 2', avatarUrl: null },
  },
]

describe('useGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('query states', () => {
    it('should return groups from query data', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: mockGroups },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useGroups())

      expect(result.current.groups).toEqual(mockGroups)
      expect(result.current.groups).toHaveLength(2)
    })

    it('should return empty array when no groups', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: null },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useGroups())

      expect(result.current.groups).toEqual([])
    })

    it('should return loading state', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useGroups())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.groups).toEqual([])
    })

    it('should return error state', () => {
      const testError = new Error('Network error')
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        loading: false,
        error: testError,
        refetch: vi.fn(),
      } as any)

      const { result } = renderHook(() => useGroups())

      expect(result.current.error).toBe(testError)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return refetch function from query', () => {
      const refetchFn = vi.fn()
      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: mockGroups },
        loading: false,
        error: null,
        refetch: refetchFn,
      } as any)

      const { result } = renderHook(() => useGroups())

      result.current.refetch()
      expect(refetchFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('createGroup', () => {
    it('should call createGroup mutation with name and description', async () => {
      const mockCreateMutation = vi.fn().mockResolvedValue({
        data: { createGroup: { id: 'group-3', name: 'New Group', description: 'Desc', memberCount: 1 } },
      })

      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: mockGroups },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation).mockReturnValue([mockCreateMutation, { loading: false }])

      const { result } = renderHook(() => useGroups())

      await act(async () => {
        await result.current.createGroup('New Group', 'A new group description')
      })

      expect(mockCreateMutation).toHaveBeenCalledTimes(1)
      expect(mockCreateMutation).toHaveBeenCalledWith({
        variables: { input: { name: 'New Group', description: 'A new group description' } },
      })
    })

    it('should call createGroup mutation without description', async () => {
      const mockCreateMutation = vi.fn().mockResolvedValue({
        data: { createGroup: { id: 'group-3', name: 'New Group', description: null, memberCount: 1 } },
      })

      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: mockGroups },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation).mockReturnValue([mockCreateMutation, { loading: false }])

      const { result } = renderHook(() => useGroups())

      await act(async () => {
        await result.current.createGroup('New Group')
      })

      expect(mockCreateMutation).toHaveBeenCalledWith({
        variables: { input: { name: 'New Group', description: undefined } },
      })
    })

    it('should return the mutation result', async () => {
      const mutationResponse = {
        data: { createGroup: { id: 'group-3', name: 'New Group', description: null, memberCount: 1 } },
      }
      const mockCreateMutation = vi.fn().mockResolvedValue(mutationResponse)

      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: mockGroups },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation).mockReturnValue([mockCreateMutation, { loading: false }])

      const { result } = renderHook(() => useGroups())

      let response: any
      await act(async () => {
        response = await result.current.createGroup('New Group')
      })

      expect(response).toEqual(mutationResponse)
    })

    it('should reflect isCreating state', () => {
      const mockCreateMutation = vi.fn()

      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: mockGroups },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation).mockReturnValue([mockCreateMutation, { loading: true }])

      const { result } = renderHook(() => useGroups())

      expect(result.current.isCreating).toBe(true)
    })

    it('should propagate mutation errors', async () => {
      const mockCreateMutation = vi.fn().mockRejectedValue(new Error('Name already taken'))

      vi.mocked(useQuery).mockReturnValue({
        data: { myGroups: mockGroups },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as any)

      vi.mocked(useMutation).mockReturnValue([mockCreateMutation, { loading: false }])

      const { result } = renderHook(() => useGroups())

      await expect(
        act(async () => {
          await result.current.createGroup('Existing Name')
        }),
      ).rejects.toThrow('Name already taken')
    })
  })
})
