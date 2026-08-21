import { gql } from '@apollo/client'

export const CREATE_DISPUTE_MUTATION = gql`
  mutation CreateDispute($input: CreateDisputeInput!) {
    createDispute(input: $input) {
      id
      status
      reason
      expiresAt
    }
  }
`

export const VOTE_DISPUTE_MUTATION = gql`
  mutation VoteOnDispute($disputeId: String!, $vote: Boolean!) {
    voteOnDispute(disputeId: $disputeId, vote: $vote) {
      id
      status
    }
  }
`

export const DISPUTES_QUERY = gql`
  query Disputes($performanceId: String!) {
    disputes(performanceId: $performanceId) {
      id
      status
      reason
      createdAt
      expiresAt
      initiatedBy {
        id
        name
      }
      votes {
        id
        vote
        user {
          id
          name
        }
      }
      performance {
        id
        value
        reps
        weight
      }
    }
  }
`

export const MY_DISPUTES_QUERY = gql`
  query MyDisputes {
    myDisputes {
      id
      status
      reason
      createdAt
      expiresAt
      initiatedBy {
        id
        name
      }
      votes {
        id
        vote
        user {
          id
          name
        }
      }
      performance {
        id
        value
        reps
        weight
        exercise {
          id
          name
        }
      }
    }
  }
`

export const GROUP_DISPUTES_QUERY = gql`
  query GroupDisputes($groupId: String!) {
    groupDisputes(groupId: $groupId) {
      id
      status
      reason
      createdAt
      expiresAt
      initiatedBy {
        id
        name
      }
      votes {
        id
        vote
        user {
          id
          name
        }
      }
      performance {
        id
        value
        reps
        weight
        exercise {
          id
          name
        }
      }
    }
  }
`
