import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react-hooks'
import { useAuth } from '../../src/hooks/useAuth'
import { useAuthStore, type User } from '../../src/stores/authStore'

// Mock Apollo Client
vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  gql: vi.fn(() => 'mocked_gql'),
}))

// Import the mocked module to access mock functions
import { useMutation } from '@apollo/client'

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  phone: null,
  avatarUrl: null,
  role: 'USER',
}

const mockLoginData = {
  data: {
    login: {
      accessToken: 'login-token-123',
      user: mockUser,
    },
  },
}

const mockRegisterData = {
  data: {
    register: {
      accessToken: 'register-token-456',
      user: { ...mockUser, id: 'user-2', name: 'New User' },
    },
  },
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
  })

  describe('login', () => {
    it('should call login mutation and store auth when successful', async () => {
      const mockLoginMutation = vi.fn().mockResolvedValue(mockLoginData)
      const mockRegisterMutation = vi.fn()

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      // Mutation was called with correct variables
      expect(mockLoginMutation).toHaveBeenCalledTimes(1)
      expect(mockLoginMutation).toHaveBeenCalledWith({
        variables: { input: { email: 'test@example.com', password: 'password123' } },
      })

      // Auth store was updated
      expect(result.current.token).toBe('login-token-123')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should throw when login mutation fails', async () => {
      const mockLoginMutation = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
      const mockRegisterMutation = vi.fn()

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrong')
        }),
      ).rejects.toThrow('Invalid credentials')

      // Auth state should remain unchanged (not authenticated)
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().token).toBeNull()
    })

    it('should not set auth when data.login is undefined', async () => {
      const mockLoginMutation = vi.fn().mockResolvedValue({ data: { login: undefined } })
      const mockRegisterMutation = vi.fn()

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'password123')
        }),
      ).rejects.toThrow()

      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('register', () => {
    it('should call register mutation and store auth when successful', async () => {
      const mockLoginMutation = vi.fn()
      const mockRegisterMutation = vi.fn().mockResolvedValue(mockRegisterData)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.register('new@example.com', 'password456', 'New User', '+1234567890')
      })

      // Mutation was called with correct variables
      expect(mockRegisterMutation).toHaveBeenCalledTimes(1)
      expect(mockRegisterMutation).toHaveBeenCalledWith({
        variables: {
          input: {
            email: 'new@example.com',
            password: 'password456',
            name: 'New User',
            phone: '+1234567890',
          },
        },
      })

      // Auth store was updated
      expect(result.current.token).toBe('register-token-456')
      expect(result.current.user?.name).toBe('New User')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should register without phone number', async () => {
      const mockLoginMutation = vi.fn()
      const mockRegisterMutation = vi.fn().mockResolvedValue(mockRegisterData)

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.register('new@example.com', 'password456', 'New User')
      })

      expect(mockRegisterMutation).toHaveBeenCalledWith({
        variables: {
          input: {
            email: 'new@example.com',
            password: 'password456',
            name: 'New User',
            phone: undefined,
          },
        },
      })

      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('logout', () => {
    it('should clear auth state', async () => {
      const mockLoginMutation = vi.fn().mockResolvedValue(mockLoginData)
      const mockRegisterMutation = vi.fn()

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())

      // First login
      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })
      expect(result.current.isAuthenticated).toBe(true)

      // Then logout
      act(() => {
        result.current.logout()
      })

      // Must re-render or check store directly to see updated state
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('isLoading', () => {
    it('should reflect login loading state', () => {
      const mockLoginMutation = vi.fn()
      const mockRegisterMutation = vi.fn()

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: true }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())
      expect(result.current.isLoading).toBe(true)
    })

    it('should reflect register loading state', () => {
      const mockLoginMutation = vi.fn()
      const mockRegisterMutation = vi.fn()

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: true }])

      const { result } = renderHook(() => useAuth())
      expect(result.current.isLoading).toBe(true)
    })

    it('should return false when neither mutation is loading', () => {
      const mockLoginMutation = vi.fn()
      const mockRegisterMutation = vi.fn()

      vi.mocked(useMutation)
        .mockReturnValueOnce([mockLoginMutation, { loading: false }])
        .mockReturnValueOnce([mockRegisterMutation, { loading: false }])

      const { result } = renderHook(() => useAuth())
      expect(result.current.isLoading).toBe(false)
    })
  })
})
