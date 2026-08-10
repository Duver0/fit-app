import { useSubscription, useApolloClient } from '@apollo/client'
import { INVITATION_RECEIVED_SUBSCRIPTION, MY_INVITATIONS_QUERY } from '../lib/graphql'
import { useUIStore } from '../stores/uiStore'

/**
 * Subscribes to invitation events for the current user.
 * When someone invites you, the invitations list is refetched and a toast is shown.
 */
export function useInvitationSubscription() {
  const client = useApolloClient()
  const addToast = useUIStore((s) => s.addToast)

  const { data, loading, error } = useSubscription(INVITATION_RECEIVED_SUBSCRIPTION, {
    onData: ({ data: subscriptionData }) => {
      const event = subscriptionData?.data?.invitationReceived
      if (!event) return

      // Refetch invitations to update the bell badge
      client.refetchQueries({
        include: [MY_INVITATIONS_QUERY],
      })

      // Show toast notification
      addToast({
        message: 'Nueva invitación de grupo recibida',
        type: 'info',
      })
    },
  })

  return { data: data?.invitationReceived, loading, error }
}
