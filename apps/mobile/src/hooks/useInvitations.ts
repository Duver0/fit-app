import { useQuery, useMutation } from '@apollo/client'
import {
  MY_INVITATIONS_QUERY,
  ACCEPT_INVITATION_MUTATION,
  DECLINE_INVITATION_MUTATION,
} from '../lib/graphql'

export function useInvitations() {
  const { data, loading, error, refetch } = useQuery(MY_INVITATIONS_QUERY, {
    pollInterval: 10000,
  })

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
    invitations: data?.myInvitations || [],
    isLoading: loading,
    isAccepting: accepting,
    isDeclining: declining,
    error,
    refetch,
    accept,
    decline,
  }
}
