import { useQuery } from '@apollo/client'
import { GROUP_QUERY } from '../lib/graphql'

export function useGroup(groupId: string) {
  const { data, loading, error, refetch } = useQuery(GROUP_QUERY, {
    variables: { id: groupId },
    skip: !groupId,
  })

  return {
    group: data?.group || null,
    isLoading: loading,
    error,
    refetch,
  }
}
