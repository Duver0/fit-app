# Exercise Refactor — GraphQL API

## Objetivo
Actualizar las queries y mutations de Exercise para incluir `imageUrl`, y agregar una mutation opcional para actualizar la imagen.

## Dependencias
- `01-database.md` debe completarse primero (el campo `imageUrl` debe existir en BD).

## API

### Queries

#### `exercises(groupId)` — actualizar respuesta

Incluir `imageUrl` en los campos retornados.

```graphql
# Estado actual (simplificado)
query Exercises($groupId: String!) {
  exercises(groupId: $groupId) {
    id
    name
    unit
    createdBy { id name }
  }
}

# Después del cambio
query Exercises($groupId: String!) {
  exercises(groupId: $groupId) {
    id
    name
    unit
    imageUrl          # ← NUEVO
    createdBy { id name avatarUrl }
  }
}
```

#### `group(id)` — actualizar para incluir `imageUrl` en ejercicios

```graphql
# Estado actual en GROUP_QUERY
exercises {
  id
  name
  unit
}

# Después del cambio
exercises {
  id
  name
  unit
  imageUrl            # ← NUEVO
}
```

### Mutations

#### `createExercise(input)` — actualizar input y respuesta

```graphql
# Estado actual
mutation CreateExercise($input: CreateExerciseInput!) {
  createExercise(input: $input) {
    id
    name
    unit
  }
}

# Después del cambio — input acepta imageUrl, respuesta la incluye
mutation CreateExercise($input: CreateExerciseInput!) {
  createExercise(input: $input) {
    id
    name
    unit
    imageUrl            # ← NUEVO
    createdBy { id name }
  }
}
```

#### `updateExerciseImage(id, imageUrl)` — NUEVA mutation (opcional)

```graphql
mutation UpdateExerciseImage($id: String!, $imageUrl: String!) {
  updateExerciseImage(id: $id, imageUrl: $imageUrl) {
    id
    name
    unit
    imageUrl
  }
}
```

### Input types

#### `CreateExerciseInput` — actualizar

```graphql
# Estado actual
input CreateExerciseInput {
  groupId: String!
  name: String!
  unit: ExerciseUnit
}

# Después del cambio
input CreateExerciseInput {
  groupId: String!
  name: String!
  unit: ExerciseUnit
  imageUrl: String      # ← NUEVO, nullable
}
```

### Permisos y guards

- `exercises`: cualquier miembro del grupo autenticado (sin cambios)
- `exercise`: cualquier miembro del grupo autenticado (sin cambios)
- `createExercise`: cualquier miembro del grupo (sin cambios)
- `updateExerciseImage`: cualquier miembro del grupo (nuevo, mismo guard que create)
- `deleteExercise`: solo OWNER del grupo (sin cambios)
