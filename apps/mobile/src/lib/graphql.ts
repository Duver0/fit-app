import { gql } from '@apollo/client'

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      phone
      avatarUrl
      role
      createdAt
      updatedAt
    }
  }
`

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user {
        id
        email
        name
        phone
        avatarUrl
        role
      }
    }
  }
`

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        name
        phone
        avatarUrl
        role
      }
    }
  }
`

export const MY_GROUPS_QUERY = gql`
  query MyGroups {
    myGroups {
      id
      name
      description
      avatarUrl
      memberCount
      createdAt
      owner {
        id
        name
        avatarUrl
      }
    }
  }
`

export const GROUP_QUERY = gql`
  query Group($id: ID!) {
    group(id: $id) {
      id
      name
      description
      avatarUrl
      memberCount
      createdAt
      owner {
        id
        name
        avatarUrl
      }
      members {
        id
        role
        user {
          id
          name
          avatarUrl
        }
      }
      exercises {
        id
        name
        unit
      }
    }
  }
`

export const CREATE_GROUP_MUTATION = gql`
  mutation CreateGroup($input: CreateGroupInput!) {
    createGroup(input: $input) {
      id
      name
      description
      avatarUrl
      memberCount
    }
  }
`

export const RANKING_QUERY = gql`
  query Ranking($exerciseId: ID!, $page: Int, $limit: Int) {
    ranking(exerciseId: $exerciseId, page: $page, limit: $limit) {
      items {
        id
        value
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
  query Top3Ranking($groupId: ID!) {
    top3Ranking(groupId: $groupId) {
      exercise {
        id
        name
        unit
      }
      top {
        id
        value
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
    }
  }
`

export const MY_PERFORMANCE_QUERY = gql`
  query MyPerformance($exerciseId: ID!) {
    myPerformance(exerciseId: $exerciseId) {
      id
      value
      recordedAt
      updatedAt
    }
  }
`

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
  mutation VoteOnDispute($disputeId: ID!, $vote: Boolean!) {
    voteOnDispute(disputeId: $disputeId, vote: $vote) {
      id
      status
    }
  }
`

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($query: String!, $excludeGroupId: String) {
    searchUsers(query: $query, excludeGroupId: $excludeGroupId) {
      id
      name
      email
    }
  }
`

export const INVITE_TO_GROUP_MUTATION = gql`
  mutation InviteToGroup($groupId: ID!, $inviteeEmail: String!) {
    inviteToGroup(groupId: $groupId, inviteeEmail: $inviteeEmail) {
      id
      status
      inviteeEmail
    }
  }
`

export const MY_INVITATIONS_QUERY = gql`
  query MyInvitations {
    myInvitations {
      id
      status
      inviteeEmail
      group {
        id
        name
        avatarUrl
      }
      inviter {
        id
        name
      }
    }
  }
`

export const ACCEPT_INVITATION_MUTATION = gql`
  mutation AcceptInvitation($invitationId: ID!) {
    acceptInvitation(invitationId: $invitationId)
  }
`

export const DECLINE_INVITATION_MUTATION = gql`
  mutation DeclineInvitation($invitationId: ID!) {
    declineInvitation(invitationId: $invitationId)
  }
`

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($name: String, $phone: String, $avatarUrl: String) {
    updateProfile(name: $name, phone: $phone, avatarUrl: $avatarUrl) {
      id
      name
      phone
      avatarUrl
    }
  }
`

export const UPDATE_GROUP_MUTATION = gql`
  mutation UpdateGroup($id: ID!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) {
      id
      name
      description
      avatarUrl
    }
  }
`

export const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroup($id: ID!) {
    deleteGroup(id: $id)
  }
`

export const CREATE_EXERCISE_MUTATION = gql`
  mutation CreateExercise($input: CreateExerciseInput!) {
    createExercise(input: $input) {
      id
      name
      unit
    }
  }
`

export const LEAVE_GROUP_MUTATION = gql`
  mutation LeaveGroup($groupId: ID!) {
    leaveGroup(groupId: $groupId)
  }
`

export const REMOVE_MEMBER_MUTATION = gql`
  mutation RemoveMember($groupId: ID!, $userId: ID!) {
    removeMember(groupId: $groupId, userId: $userId)
  }
`

export const DISPUTES_QUERY = gql`
  query Disputes($performanceId: ID!) {
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
        exercise {
          id
          name
        }
      }
    }
  }
`

export const EXERCISES_QUERY = gql`
  query Exercises($groupId: ID!) {
    exercises(groupId: $groupId) {
      id
      name
      unit
      createdBy {
        id
        name
      }
    }
  }
`
