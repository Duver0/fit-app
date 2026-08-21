import { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useIsFocused } from '@react-navigation/native'
import {
  MY_INVITATIONS_QUERY,
  ACCEPT_INVITATION_MUTATION,
  DECLINE_INVITATION_MUTATION,
} from '../lib/graphql'

export function useInvitations() {
  const isFocused = useIsFocused()

  const invitationsQuery = useQuery(MY_INVITATIONS_QUERY)

  useEffect(() => {
    if (isFocused) {
      invitationsQuery.startPolling?.(30_000)
    } else {
      invitationsQuery.stopPolling?.()
    }
    return () => { invitationsQuery.stopPolling?.() }
  }, [isFocused, invitationsQuery])

  const [acceptMutation, { loading: accepting }] = useMutation(ACCEPT_INVITATION_MUTATION, {
    refetchQueries: [{ query: MY_INVITATIONS_QUERY }],
  })

  const [declineMutation, { loading: declining }] = useMutation(DECLINE_INVITATION_MUTATION, {
    refetchQueries: [{ query: MY_INVITATIONS_QUERY }],
  })

  const accept = async (invitationId: string) => {
    return acceptMutation({ variables: { invitationId } })
  }

  const decline = async (invitationId: string) => {
    return declineMutation({ variables: { invitationId } })
  }

  return {
    invitations: invitationsQuery.data?.myInvitations || [],
    isLoading: invitationsQuery.loading,
    isAccepting: accepting,
    isDeclining: declining,
    error: invitationsQuery.error,
    refetch: invitationsQuery.refetch,
    accept,
    decline,
  }
}
