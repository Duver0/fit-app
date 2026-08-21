import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

// Apunta a la función serverless de Vercel (sobrescribible con EXPO_PUBLIC_API_URL).
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fit-app-lake-gamma.vercel.app/graphql'

// ---------------------------------------------------------------------------
// HTTP link (queries & mutations)
// ---------------------------------------------------------------------------
const httpLink = createHttpLink({ uri: API_URL })

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
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
