import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface User {
  id: string
  email: string
  name: string
  phone?: string | null
  avatarUrl?: string | null
  role: 'USER' | 'SUPER_ADMIN'
  /** @deprecated Se mantiene por compatibilidad con backend/persist. No usar para visibilidad: la tab Rutina es fija. */
  routineEnabled?: boolean
  singleGroupAutoEnter?: boolean
  createdAt?: string
  updatedAt?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  /** User's configured rest day (0 = Monday, 6 = Sunday). Default: 6 (Sunday). Stored locally. */
  restDay: number
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
  setRestDay: (day: number) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      restDay: 6, // Default: Sunday (6)
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
      updateUser: (data) => set(state => ({ user: state.user ? { ...state.user, ...data } : null })),
      setRestDay: (day) => set({ restDay: day }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
