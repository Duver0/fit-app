import { useMutation } from '@apollo/client'
import { useAuthStore } from '../stores/authStore'
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
} from '../lib/graphql'

export function useAuth() {
  const { token, user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN_MUTATION)
  const [registerMutation, { loading: registerLoading }] = useMutation(REGISTER_MUTATION)

  const login = async (email: string, password: string) => {
    const { data } = await loginMutation({ variables: { input: { email, password } } })
    setAuth(data.login.accessToken, data.login.user)
  }

  const register = async (email: string, password: string, name: string, phone?: string) => {
    const { data } = await registerMutation({
      variables: { input: { email, password, name, phone } },
    })
    setAuth(data.register.accessToken, data.register.user)
  }

  const logout = () => clearAuth()

  return {
    token,
    user,
    isAuthenticated,
    isLoading: loginLoading || registerLoading,
    login,
    register,
    logout,
  }
}
