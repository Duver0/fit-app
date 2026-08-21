import { gql } from '@apollo/client'

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
  query Group($id: String!) {
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
        imageUrl
        categoryId
        category {
          id
          name
        }
        wgerId
        wgerCategory
        wgerMuscles
        wgerEquipment
        createdBy {
          id
        }
      }
      categories {
        id
        name
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

export const UPDATE_GROUP_MUTATION = gql`
  mutation UpdateGroup($id: String!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) {
      id
      name
      description
      avatarUrl
    }
  }
`

export const DELETE_GROUP_MUTATION = gql`
  mutation DeleteGroup($id: String!) {
    deleteGroup(id: $id)
  }
`

export const LEAVE_GROUP_MUTATION = gql`
  mutation LeaveGroup($groupId: String!) {
    leaveGroup(groupId: $groupId)
  }
`

export const REMOVE_MEMBER_MUTATION = gql`
  mutation RemoveMember($groupId: String!, $userId: String!) {
    removeMember(groupId: $groupId, userId: $userId)
  }
`

export const SEARCH_USERS_QUERY = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      name
      email
      avatarUrl
    }
  }
`

export const INVITE_TO_GROUP_MUTATION = gql`
  mutation InviteToGroup($groupId: String!, $inviteeIdentifier: String!) {
    inviteToGroup(groupId: $groupId, inviteeIdentifier: $inviteeIdentifier) {
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
  mutation AcceptInvitation($invitationId: String!) {
    acceptInvitation(invitationId: $invitationId)
  }
`

export const DECLINE_INVITATION_MUTATION = gql`
  mutation DeclineInvitation($invitationId: String!) {
    declineInvitation(invitationId: $invitationId)
  }
`

export const GROUP_IMAGES_QUERY = gql`
  query GroupImages($category: String!, $limit: Int) {
    groupImages(category: $category, limit: $limit) {
      id
      provider
      url
      thumbnail
      author
      attributionUrl
      width
      height
    }
  }
`

export const SEARCH_GROUP_AVATAR_QUERY = gql`
  query SearchGroupImages($query: String!, $limit: Int) {
    searchGroupImages(query: $query, limit: $limit) {
      id
      provider
      url
      thumbnail
      author
      attributionUrl
      width
      height
    }
  }
`

export const SEARCH_STOCK_IMAGES_QUERY = SEARCH_GROUP_AVATAR_QUERY
