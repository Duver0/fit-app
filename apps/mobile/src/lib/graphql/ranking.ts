import { gql } from '@apollo/client'

export const RANKING_QUERY = gql`
  query Ranking($exerciseId: String!, $page: Int, $limit: Int) {
    ranking(exerciseId: $exerciseId, page: $page, limit: $limit) {
      items {
        id
        value
        reps
        weight
        rank
        user {
          id
          name
          avatarUrl
        }
      }
      totalCount
      currentPage
      totalPages
    }
  }
`

export const TOP3_RANKING_QUERY = gql`
  query Top3Ranking($groupId: String!) {
    top3Ranking(groupId: $groupId) {
      exercise {
        id
        name
        unit
        imageUrl
      }
      top {
        id
        value
        reps
        weight
        rank
        user {
          id
          name
          avatarUrl
        }
      }
    }
  }
`

export const UPSERT_PERFORMANCE_MUTATION = gql`
  mutation UpsertPerformance($input: UpsertPerformanceInput!) {
    upsertPerformance(input: $input) {
      id
      value
      reps
      weight
    }
  }
`

export const MY_PERFORMANCE_QUERY = gql`
  query MyPerformance($exerciseId: String!) {
    myPerformance(exerciseId: $exerciseId) {
      id
      value
      reps
      weight
      recordedAt
      updatedAt
    }
  }
`
