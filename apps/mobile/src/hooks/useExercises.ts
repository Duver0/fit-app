import { useQuery, useMutation } from '@apollo/client'
import { EXERCISES_QUERY, CREATE_EXERCISE_MUTATION } from '../lib/graphql'

export function useExercises(groupId: string) {
  const { data, loading, error, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { groupId },
    skip: !groupId,
    pollInterval: 15000,
  })

  const [createExerciseMutation, { loading: isCreating }] = useMutation(CREATE_EXERCISE_MUTATION, {
    refetchQueries: [{ query: EXERCISES_QUERY, variables: { groupId } }],
  })

  const createExercise = async (name: string, unit: string = 'KG', imageUrl?: string) => {
    return createExerciseMutation({
      variables: { input: { groupId, name, unit, ...(imageUrl ? { imageUrl } : {}) } },
    })
  }

  return {
    exercises: data?.exercises || [],
    isLoading: loading,
    isCreating,
    error,
    refetch,
    createExercise,
  }
}
