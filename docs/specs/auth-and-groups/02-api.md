# Auth & Groups — API (GraphQL)

> **Status: ✅ COMPLETADO** — Todos los ObjectTypes, InputTypes, resolvers y guards implementados. Backend compila.

## Objetivo
Definir todas las queries, mutations, inputs, y tipos GraphQL necesarios para autenticación, gestión de grupos, ejercicios, marcas de rendimiento, rankings y disputas.

## Dependencias
- `01-database.md` debe estar implementada (modelos Prisma existentes).

---

## Auth

### Mutations

```graphql
type AuthPayload {
  accessToken: String!
  user: User!
}

input RegisterInput {
  email: String!
  password: String!
  name: String!
  phone: String
}

input LoginInput {
  email: String!
  password: String!
}

extend type Mutation {
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  loginWithEmailOnly(email: String!): AuthPayload!
}
```

## User

### Types
```graphql
type User {
  id: ID!
  auth0Id: String!
  email: String!
  phone: String
  name: String!
  avatarUrl: String
  role: UserRole!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserRole {
  USER
  SUPER_ADMIN
}
```

### Queries
```graphql
extend type Query {
  me: User!
  user(id: ID!): User!              @auth(requires: SUPER_ADMIN)
  users(page: Int, limit: Int): UserConnection!  @auth(requires: SUPER_ADMIN)
}
```

### Mutations
```graphql
input UpdateProfileInput {
  name: String
  phone: String
  avatarUrl: String  # URL del avatar servido por Nginx
}

extend type Mutation {
  updateProfile(input: UpdateProfileInput!): User!
}
```

## Group

### Types
```graphql
type Group {
  id: ID!
  name: String!
  description: String
  avatarUrl: String
  owner: User!
  memberCount: Int!
  members: [GroupMember!]!
  exercises: [Exercise!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type GroupMember {
  id: ID!
  user: User!
  role: GroupMemberRole!
  joinedAt: DateTime!
}

enum GroupMemberRole {
  OWNER
  MEMBER
}

type GroupConnection {
  items: [Group!]!
  totalCount: Int!
  currentPage: Int!
  totalPages: Int!
}
```

### Queries
```graphql
extend type Query {
  myGroups: [Group!]!
  group(id: ID!): Group!
  groupMembers(groupId: ID!): [GroupMember!]!
}
```

### Mutations
```graphql
input CreateGroupInput {
  name: String!
  description: String
  avatarUrl: Upload
}

input UpdateGroupInput {
  name: String
  description: String
  avatarUrl: Upload
}

extend type Mutation {
  createGroup(input: CreateGroupInput!): Group!
  updateGroup(id: ID!, input: UpdateGroupInput!): Group!       @auth(requires: [OWNER, SUPER_ADMIN])
  deleteGroup(id: ID!): Boolean!                                @auth(requires: [OWNER, SUPER_ADMIN])
  leaveGroup(groupId: ID!): Boolean!
  removeMember(groupId: ID!, userId: ID!): Boolean!             @auth(requires: OWNER)
}
```

## Invitation

### Types
```graphql
type Invitation {
  id: ID!
  group: Group!
  inviter: User!
  inviteeEmail: String!
  status: InviteStatus!
  createdAt: DateTime!
}

enum InviteStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
}
```

### Mutations
```graphql
extend type Mutation {
  inviteToGroup(groupId: ID!, inviteeEmail: String!): Invitation!  @auth(requires: [OWNER, MEMBER])
  acceptInvitation(invitationId: ID!): GroupMember!
  declineInvitation(invitationId: ID!): Invitation!
  myInvitations: [Invitation!]!
}
```

## Exercise

### Types
```graphql
type Exercise {
  id: ID!
  groupId: ID!
  name: String!
  unit: ExerciseUnit!
  createdBy: User!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ExerciseUnit {
  KG
  REPS
  MIN
  SEC
  M
}
```

### Queries
```graphql
extend type Query {
  exercises(groupId: ID!): [Exercise!]!
  exercise(id: ID!): Exercise!
}
```

### Mutations
```graphql
input CreateExerciseInput {
  groupId: ID!
  name: String!
  unit: ExerciseUnit! = KG
}

extend type Mutation {
  createExercise(input: CreateExerciseInput!): Exercise!    @auth(requires: OWNER)
  deleteExercise(id: ID!): Boolean!                         @auth(requires: [OWNER, SUPER_ADMIN])
}
```

## Performance

### Types
```graphql
type PerformanceRecord {
  id: ID!
  exercise: Exercise!
  user: User!
  group: Group!
  value: Float!
  recordedAt: DateTime!
  updatedAt: DateTime!
  rank: Int  # solo cuando se devuelve en contexto de ranking
}
```

### Queries
```graphql
extend type Query {
  myPerformance(exerciseId: ID!): PerformanceRecord  # mi propia marca
  ranking(exerciseId: ID!, page: Int, limit: Int): RankingConnection!
}

type RankingConnection {
  items: [PerformanceRecord!]!
  totalCount: Int!
  currentPage: Int!
  totalPages: Int!
}
```

### Mutations
```graphql
input UpsertPerformanceInput {
  exerciseId: ID!
  value: Float!
}

extend type Mutation {
  upsertPerformance(input: UpsertPerformanceInput!): PerformanceRecord!
}
```

## Dispute

### Types
```graphql
type Dispute {
  id: ID!
  performance: PerformanceRecord!
  initiatedBy: User!
  reason: String!
  status: DisputeStatus!
  votes: [DisputeVote!]!
  createdAt: DateTime!
  expiresAt: DateTime!
  voteCount: Int!
  groupMemberCount: Int!           # total de miembros del grupo en ese momento
}

type DisputeVote {
  id: ID!
  user: User!
  vote: Boolean!
  createdAt: DateTime!
}

enum DisputeStatus {
  OPEN
  APPROVED
  REJECTED
}
```

### Queries
```graphql
extend type Query {
  disputes(performanceId: ID!): [Dispute!]!
  myDisputes: [Dispute!]!          # disputas donde participo (como initiator o votante)
}
```

### Mutations
```graphql
input CreateDisputeInput {
  performanceId: ID!
  reason: String!
}

extend type Mutation {
  createDispute(input: CreateDisputeInput!): Dispute!
  voteOnDispute(disputeId: ID!, vote: Boolean!): DisputeVote!
}
```

## Admin (SUPER_ADMIN only)

```graphql
extend type Query {
  adminGroups(page: Int, limit: Int): GroupConnection!          @auth(requires: SUPER_ADMIN)
  adminUsers(page: Int, limit: Int): UserConnection!            @auth(requires: SUPER_ADMIN)
  adminExercises(page: Int, limit: Int): ExerciseConnection!    @auth(requires: SUPER_ADMIN)
}

extend type Mutation {
  adminDeleteGroup(id: ID!): Boolean!                           @auth(requires: SUPER_ADMIN)
  adminUpdateGroup(id: ID!, input: UpdateGroupInput!): Group!   @auth(requires: SUPER_ADMIN)
  adminDeleteUser(id: ID!): Boolean!                            @auth(requires: SUPER_ADMIN)
  adminDeleteExercise(id: ID!): Boolean!                        @auth(requires: SUPER_ADMIN)
}
```

## Subscriptions
```graphql
type Subscription {
  disputeResolved(disputeId: ID!): Dispute!
  newInvitation: Invitation!
  rankingUpdated(exerciseId: ID!): PerformanceRecord
}
```

## Guards / Directivas

| Directiva | Descripción |
|---|---|
| `@auth(requires: SUPER_ADMIN)` | Solo super admin |
| `@auth(requires: OWNER)` | Solo GROUP_OWNER del grupo en cuestión (valida en resolver) |
| `@auth(requires: [OWNER, SUPER_ADMIN])` | Owner del grupo O super admin |
| `@auth(requires: [OWNER, MEMBER])` | Cualquier miembro del grupo |

Los resolvers reciben `@CurrentUser()` decorator que inyecta el usuario autenticado desde el JWT.

## Pagination
Todos los listados paginados usan el patrón:
```graphql
type Connection {
  items: [T!]!
  totalCount: Int!
  currentPage: Int!
  totalPages: Int!
}
```
