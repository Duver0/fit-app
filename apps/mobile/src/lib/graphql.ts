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

export const CREATE_EXERCISE_MUTATION = gql`
  mutation CreateExercise($input: CreateExerciseInput!) {
    createExercise(input: $input) {
      id
      name
      unit
      imageUrl
      categoryId
      category {
        id
        name
      }
    }
  }
`

export const UPDATE_EXERCISE_IMAGE_MUTATION = gql`
  mutation UpdateExerciseImage($input: UpdateExerciseImageInput!) {
    updateExerciseImage(input: $input) {
      id
      name
      unit
      imageUrl
    }
  }
`

export const UPDATE_EXERCISE_MUTATION = gql`
  mutation UpdateExercise($input: UpdateExerciseInput!) {
    updateExercise(input: $input) {
      id
      name
      imageUrl
      unit
      categoryId
      category {
        id
        name
      }
    }
  }
`

export const CHANGE_EXERCISE_CATEGORY_MUTATION = gql`
  mutation ChangeExerciseCategory($id: String!, $categoryId: String) {
    changeExerciseCategory(id: $id, categoryId: $categoryId) {
      id
      categoryId
      category {
        id
        name
      }
    }
  }
`

export const DELETE_EXERCISE_MUTATION = gql`
  mutation DeleteExercise($id: String!) {
    deleteExercise(id: $id)
  }
`

export const ENRICH_EXERCISE_MUTATION = gql`
  mutation EnrichExercise($id: String!, $wgerData: WgerDataInput!) {
    enrichExercise(id: $id, wgerData: $wgerData) {
      id
      name
      imageUrl
      wgerId
      wgerCategory
      wgerMuscles
      wgerEquipment
      wgerInstructions
    }
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

export const EXERCISES_QUERY = gql`
  query Exercises($groupId: String!) {
    exercises(groupId: $groupId) {
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
        name
        avatarUrl
      }
    }
  }
`

export const EXERCISE_CATEGORIES_QUERY = gql`
  query ExerciseCategories($groupId: String!) {
    exerciseCategories(groupId: $groupId) {
      id
      name
    }
  }
`

export const CREATE_EXERCISE_CATEGORY_MUTATION = gql`
  mutation CreateExerciseCategory($input: CreateExerciseCategoryInput!) {
    createExerciseCategory(input: $input) {
      id
      name
    }
  }
`

export const UPDATE_EXERCISE_CATEGORY_MUTATION = gql`
  mutation UpdateExerciseCategory($id: String!, $input: UpdateExerciseCategoryInput!) {
    updateExerciseCategory(id: $id, input: $input) {
      id
      name
    }
  }
`

export const DELETE_EXERCISE_CATEGORY_MUTATION = gql`
  mutation DeleteExerciseCategory($id: String!) {
    deleteExerciseCategory(id: $id)
  }
`

export const SEARCH_EXERCISES_QUERY = gql`
  query SearchExercises($name: String!, $limit: Int, $offset: Int) {
    searchExercises(name: $name, limit: $limit, offset: $offset) {
      items {
        id
        name
        category
        image
        thumbnail
        muscles
        equipment
        description
      }
      total
      hasNextPage
      nextOffset
    }
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

// ---------------------------------------------------------------------------
// Routine (Rutina)
// ---------------------------------------------------------------------------

export const TOGGLE_ROUTINE_MUTATION = gql`
  mutation ToggleRoutine($enabled: Boolean!) {
    toggleRoutine(enabled: $enabled) {
      id
      routineEnabled
    }
  }
`

export const MY_ROUTINE_DAYS_QUERY = gql`
  query MyRoutineDays {
    myRoutineDays {
      id
      dayOfWeek
      name
      exercises {
        id
        sortOrder
        exercise {
          id
          name
          unit
          imageUrl
          groupId
        }
        myPerformance {
          id
          value
          reps
          weight
        }
      }
    }
  }
`

export const ROUTINE_DAY_QUERY = gql`
  query RoutineDay($dayOfWeek: Int!) {
    routineDay(dayOfWeek: $dayOfWeek) {
      id
      dayOfWeek
      name
      exercises {
        id
        sortOrder
        exercise {
          id
          name
          unit
          imageUrl
          groupId
        }
        group {
          id
          name
        }
        myPerformance {
          id
          value
          reps
          weight
        }
      }
    }
  }
`

export const ADD_EXERCISE_TO_DAY_MUTATION = gql`
  mutation AddExerciseToDay($dayOfWeek: Int!, $exerciseId: String!) {
    addExerciseToDay(dayOfWeek: $dayOfWeek, exerciseId: $exerciseId) {
      id
      dayOfWeek
      name
      exercises {
        id
        sortOrder
        exercise {
          id
          name
          unit
          imageUrl
          groupId
        }
        group {
          id
          name
        }
        myPerformance {
          id
          value
          reps
          weight
        }
      }
    }
  }
`

export const REMOVE_EXERCISE_FROM_DAY_MUTATION = gql`
  mutation RemoveExerciseFromDay($dayOfWeek: Int!, $exerciseId: String!) {
    removeExerciseFromDay(dayOfWeek: $dayOfWeek, exerciseId: $exerciseId) {
      id
      dayOfWeek
      exercises {
        id
        sortOrder
      }
    }
  }
`

export const REORDER_EXERCISES_MUTATION = gql`
  mutation ReorderExercises($dayOfWeek: Int!, $exerciseIds: [String!]!) {
    reorderExercises(dayOfWeek: $dayOfWeek, exerciseIds: $exerciseIds) {
      id
      dayOfWeek
      exercises {
        id
        sortOrder
        exercise {
          id
          name
          unit
        }
        myPerformance {
          id
          value
          reps
          weight
        }
      }
    }
  }
`

export const UPDATE_ROUTINE_DAY_NAME_MUTATION = gql`
  mutation UpdateRoutineDayName($dayOfWeek: Int!, $name: String) {
    updateRoutineDayName(dayOfWeek: $dayOfWeek, name: $name) {
      id
      dayOfWeek
      name
      exercises {
        id
        sortOrder
      }
    }
  }
`

export const MY_EXERCISES_FOR_ROUTINE_QUERY = gql`
  query MyExercisesForRoutine {
    myExercisesForRoutine {
      id
      name
      unit
      imageUrl
      groupId
      group {
        id
        name
      }
      myPerformance {
        id
        value
        reps
        weight
      }
    }
  }
`
