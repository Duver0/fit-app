import { gql } from '@apollo/client'

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
