import { useRealtime } from '../hooks/useRealtime'

/**
 * Provider component that initializes all real-time subscriptions.
 * Mount this at the root level (inside ApolloProvider) to enable
 * real-time updates across the entire application.
 *
 * This component renders nothing — it only manages subscription lifecycles.
 */
export function RealtimeProvider() {
  useRealtime()
  return null
}
