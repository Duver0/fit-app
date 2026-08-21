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
      routineEnabled
      singleGroupAutoEnter
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
        routineEnabled
        singleGroupAutoEnter
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
        routineEnabled
        singleGroupAutoEnter
      }
    }
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

export const TOGGLE_ROUTINE_MUTATION = gql`
  mutation ToggleRoutine($enabled: Boolean!) {
    toggleRoutine(enabled: $enabled) {
      id
      routineEnabled
    }
  }
`

export const TOGGLE_SINGLE_GROUP_AUTO_ENTER_MUTATION = gql`
  mutation ToggleSingleGroupAutoEnter($enabled: Boolean!) {
    toggleSingleGroupAutoEnter(enabled: $enabled) {
      id
      singleGroupAutoEnter
    }
  }
`
