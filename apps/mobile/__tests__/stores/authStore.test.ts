import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, type User } from '../../src/stores/authStore'

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  phone: null,
  avatarUrl: null,
  role: 'USER',
}

const initialStoreState = {
  token: null,
  user: null,
  isAuthenticated: false,
}

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState(initialStoreState)
  })

  describe('initial state', () => {
    it('should start with null token', () => {
      expect(useAuthStore.getState().token).toBeNull()
    })

    it('should start with null user', () => {
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('should start not authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('setAuth', () => {
    it('should store token', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      expect(useAuthStore.getState().token).toBe('token-123')
    })

    it('should store user', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      expect(useAuthStore.getState().user).toEqual(mockUser)
    })

    it('should set isAuthenticated to true', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('should replace existing token', () => {
      useAuthStore.getState().setAuth('first-token', mockUser)
      useAuthStore.getState().setAuth('second-token', mockUser)
      expect(useAuthStore.getState().token).toBe('second-token')
    })
  })

  describe('clearAuth', () => {
    it('should clear token', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().token).toBeNull()
    })

    it('should clear user', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('should set isAuthenticated to false', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('updateUser', () => {
    it('should update user name', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      useAuthStore.getState().updateUser({ name: 'Updated Name' })
      expect(useAuthStore.getState().user?.name).toBe('Updated Name')
    })

    it('should update user phone', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      useAuthStore.getState().updateUser({ phone: '+1234567890' })
      expect(useAuthStore.getState().user?.phone).toBe('+1234567890')
    })

    it('should update user avatarUrl', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      useAuthStore.getState().updateUser({ avatarUrl: 'https://example.com/avatar.png' })
      expect(useAuthStore.getState().user?.avatarUrl).toBe('https://example.com/avatar.png')
    })

    it('should keep other fields unchanged', () => {
      useAuthStore.getState().setAuth('token-123', mockUser)
      useAuthStore.getState().updateUser({ name: 'Updated Name' })
      const user = useAuthStore.getState().user
      expect(user?.email).toBe('test@example.com')
      expect(user?.id).toBe('user-1')
      expect(user?.role).toBe('USER')
    })

    it('should do nothing when user is null', () => {
      useAuthStore.getState().updateUser({ name: 'Updated Name' })
      expect(useAuthStore.getState().user).toBeNull()
    })
  })
})
