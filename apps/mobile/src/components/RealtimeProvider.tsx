import { useRealtime } from '../hooks/useRealtime'

/**
 * Provider component that initializes all real-time subscriptions.
 * Mount this at the root level (inside ApolloProvider) to enable
 * real-time updates across the entire application.
 *
 * Uses a component-per-group pattern to respect React's Rules of Hooks.
 */
export function RealtimeProvider() {
  const { groupIds, GroupSubscriptions } = useRealtime()

  return (
    <>
      {groupIds.map((groupId: string) => (
        <GroupSubscriptions key={groupId} groupId={groupId} />
      ))}
    </>
  )
}
