import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { RetryLink } from '@apollo/client/link/retry'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

// Apunta a la función serverless de Vercel (sobrescribible con EXPO_PUBLIC_API_URL).
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fit-app-lake-gamma.vercel.app/graphql'

// ---------------------------------------------------------------------------
// Retry link — exponential backoff para absorber cold starts de Render/Vercel.
// Cadena: retryLink → httpLink
// ---------------------------------------------------------------------------
const retryLink = new RetryLink({
  delay: {
    initial: 1000,
    max: 5000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error) => !!error,
  },
})

// ---------------------------------------------------------------------------
// HTTP link (queries & mutations) — 15 s timeout para cold starts
// ---------------------------------------------------------------------------
const httpLink = createHttpLink({
  uri: API_URL,
  fetch: (uri: RequestInfo, options: RequestInit) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)
    return fetch(uri, { ...options, signal: controller.signal }).finally(() =>
      clearTimeout(timeoutId),
    )
  },
})

// ---------------------------------------------------------------------------
// Auth link — attaches JWT to every HTTP request
// ---------------------------------------------------------------------------
const authLink = setContext((_, { headers }) => {
  const token = useAuthStore.getState().token
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// ---------------------------------------------------------------------------
// Error link — solo para errores de red (los GraphQL los maneja cada
// componente con toast). Los errores de red no siempre lanzan excepción
// en el componente, así que ésta es la única forma de atraparlos.
// Se hace "debounce" del toast para que un backend caído no inunde la UI
// con decenas de toasts idénticos.
// ---------------------------------------------------------------------------
let lastNetworkToastAt = 0
const errorLink = onError(({ networkError }) => {
  if (networkError) {
    const now = Date.now()
    if (now - lastNetworkToastAt > 5000) {
      lastNetworkToastAt = now
      useUIStore.getState().addToast({
        message:
          'Error de conexión. Revisá tu internet e intentá de nuevo.',
        type: 'error',
      })
    }
  }
})

export const client = new ApolloClient({
  link: from([errorLink, authLink, retryLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      User: { keyFields: ['id'] },
      Group: { keyFields: ['id'] },
      Exercise: { keyFields: ['id'] },
      PerformanceRecord: { keyFields: ['id'] },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
