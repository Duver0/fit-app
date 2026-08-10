import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fit-app-api-3zds.onrender.com/graphql'

// Derive WebSocket URL from HTTP URL
const WS_URL = API_URL.replace(/^http/, 'ws')

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
// ---------------------------------------------------------------------------
const errorLink = onError(({ networkError }) => {
  if (networkError) {
    useUIStore.getState().addToast({
      message:
        'Error de conexión. Revisá tu internet e intentá de nuevo.',
      type: 'error',
    })
  }
})

// ---------------------------------------------------------------------------
// WebSocket link (subscriptions)
// ---------------------------------------------------------------------------
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: () => ({
      authorization: useAuthStore.getState().token
        ? `Bearer ${useAuthStore.getState().token}`
        : '',
    }),
    shouldRetry: () => true,
    retryAttempts: Infinity,
    retryWait: (retries) =>
      new Promise((resolve) =>
        setTimeout(resolve, Math.min(1000 * 2 ** retries, 30000)),
      ),
    on: {
      error: (err) => console.warn('[WS] Error:', err),
      closed: () => console.log('[WS] Connection closed'),
      connected: () => console.log('[WS] Connected'),
    },
  }),
)

// ---------------------------------------------------------------------------
// Split link: subscriptions → WS, everything else → HTTP
// ---------------------------------------------------------------------------
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  from([errorLink, authLink, httpLink]),
)

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
