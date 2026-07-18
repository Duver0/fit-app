import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

const httpLink = createHttpLink({
  uri: process.env.EXPO_PUBLIC_API_URL || 'https://fit-app-api-3zds.onrender.com/graphql',
})

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

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
