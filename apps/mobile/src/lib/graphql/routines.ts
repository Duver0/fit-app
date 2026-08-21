import { gql } from '@apollo/client'

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
