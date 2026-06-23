import { useQuery, useMutation } from '@apollo/client'
import { MY_GROUPS_QUERY, CREATE_GROUP_MUTATION } from '../lib/graphql'

export function useGroups() {
  const { data, loading, error, refetch } = useQuery(MY_GROUPS_QUERY)
  const [createGroupMutation, { loading: creating }] = useMutation(CREATE_GROUP_MUTATION, {
    refetchQueries: [{ query: MY_GROUPS_QUERY }],
  })

  const createGroup = async (name: string, description?: string) => {
    return createGroupMutation({ variables: { input: { name, description } } })
  }

  return {
    groups: data?.myGroups || [],
    isLoading: loading,
    isCreating: creating,
    error,
    refetch,
    createGroup,
  }
}
