# Dispute System — 02 API Contracts (GraphQL)

## Objetivo
Definir el contrato GraphQL completo para el sistema de disputas: types, queries, mutations, inputs, enums y permisos/guards.

## Dependencias
- `01-database.md` (modelos Prisma definidos)
- `02-api.md` de `auth-and-groups` (types `User`, `Group`, `GroupMember`)
- `02-api.md` de `performance` (types `PerformanceRecord`, `Exercise`)

## Tipos Generados (TypeGraphQL / Prisma -> GraphQL)

### Enums

```graphql
enum DisputeStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum VoteType {
  APPROVE
  REJECT
}
```

### Object Types

```graphql
type Dispute {
  id: ID!
  status: DisputeStatus!
  group: Group!
  performanceRecord: PerformanceRecord!
  creator: User!
  votes: [Vote!]!
  voteCounts: VoteCounts!
  userVote: VoteType  # Voto del usuario actual (si votó)
  canVote: Boolean!   # Si el usuario actual puede votar
  createdAt: DateTime!
  updatedAt: DateTime!
  resolvedAt: DateTime
  expiresAt: DateTime!
  isExpired: Boolean!
  timeRemaining: Int  # Segundos restantes, null si resuelto
}

type Vote {
  id: ID!
  type: VoteType!
  dispute: Dispute!
  voter: User!
  createdAt: DateTime!
}

type VoteCounts {
  approve: Int!
  reject: Int!
  total: Int!
  threshold: Int!     # Votos necesarios para 51%
  activeMembers: Int! # Miembros activos del grupo
  percentage: Float!  # Porcentaje actual de votos APPROVE
}

type DisputeConnection {
  edges: [DisputeEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type DisputeEdge {
  node: Dispute!
  cursor: String!
}
```

### Input Types

```graphql
input CreateDisputeInput {
  performanceRecordId: ID!
  groupId: ID!
}

input VoteInput {
  disputeId: ID!
  type: VoteType!
}

input DisputeFilterInput {
  status: DisputeStatus
  groupId: ID
  creatorId: ID
  dateFrom: DateTime
  dateTo: DateTime
}

input DisputesQueryInput {
  filter: DisputeFilterInput
  first: Int
  after: String
  last: Int
  before: String
  orderBy: DisputeOrderByInput
}

input DisputeOrderByInput {
  field: DisputeOrderField!
  direction: OrderDirection!
}

enum DisputeOrderField {
  CREATED_AT
  UPDATED_AT
  RESOLVED_AT
  EXPIRES_AT
}

enum OrderDirection {
  ASC
  DESC
}
```

## Queries

```graphql
type Query {
  # Disputa individual
  dispute(id: ID!): Dispute
  
  # Disputas de un grupo (paginadas)
  groupDisputes(groupId: ID!, input: DisputesQueryInput): DisputeConnection!
  
  # Disputas activas de un grupo (para badge/notification count)
  activeGroupDisputes(groupId: ID!): [Dispute!]!
  
  # Disputas creadas por el usuario actual
  myDisputes(input: DisputesQueryInput): DisputeConnection!
  
  # Disputas donde el usuario votó
  myVotedDisputes(input: DisputesQueryInput): DisputeConnection!
  
  # Verificar si una marca tiene disputa activa
  activeDisputeForRecord(performanceRecordId: ID!): Dispute
  
  # Stats de disputa para UI (contadores, porcentajes)
  disputeStats(disputeId: ID!): VoteCounts!
}
```

## Mutations

```graphql
type Mutation {
  # Crear disputa
  createDispute(input: CreateDisputeInput!): Dispute!
  
  # Votar en disputa
  voteDispute(input: VoteInput!): Vote!
  
  # Cancelar disputa (solo creador o admin/owner)
  cancelDispute(disputeId: ID!): Dispute!
  
  # Resolver disputa manualmente (SUPER_ADMIN / GROUP_OWNER)
  resolveDispute(disputeId: ID!, status: DisputeStatus!): Dispute!
}
```

## Permisos / Guards por Operación

| Operación | Guards | Reglas de Negocio |
|-----------|--------|-------------------|
| `dispute(id)` | `@Authenticated`, `@GroupMember(groupId)` | Miembro del grupo puede ver |
| `groupDisputes` | `@Authenticated`, `@GroupMember(groupId)` | Paginado, filtros |
| `activeGroupDisputes` | `@Authenticated`, `@GroupMember(groupId)` | Solo PENDING |
| `myDisputes` | `@Authenticated` | Propias |
| `myVotedDisputes` | `@Authenticated` | Donde votó |
| `activeDisputeForRecord` | `@Authenticated`, `@GroupMember` | Ver si marca tiene disputa |
| `disputeStats` | `@Authenticated`, `@GroupMember` | Stats para UI |
| `createDispute` | `@Authenticated`, `@GroupMember(groupId)` | Ver validaciones abajo |
| `voteDispute` | `@Authenticated`, `@GroupMember(groupId)` | Ver validaciones abajo |
| `cancelDispute` | `@Authenticated`, `@GroupMember(groupId)` | Solo creador, owner o admin |
| `resolveDispute` | `@Authenticated`, `@Role(GROUP_OWNER, SUPER_ADMIN)` | Solo owner/admin |

## Validaciones de Mutations

### createDispute
```typescript
// Validaciones en resolver/guard/servicio:
1. Usuario autenticado
2. Usuario es miembro ACTIVO del grupo (groupId)
3. performanceRecord existe y pertenece al grupo
4. performanceRecord NO tiene deletedAt (no está eliminada)
4. performanceRecord.userId != currentUserId (no propia marca)
5. NO existe disputa PENDING para ese performanceRecord (partial unique index)
6. performanceRecord no está en disputa propia del usuario
7. Crear disputa con expiresAt = now() + 7 días
8. Notificar (FCM via Bull queue): dueño de la marca + owner del grupo
```

### voteDispute
```typescript
// Validaciones:
1. Usuario autenticado
2. Usuario es miembro ACTIVO del grupo de la disputa
3. Disputa existe y status = PENDING
4. Disputa NO expirada (now() < expiresAt)
5. Usuario != creator de la disputa (creador no vota en su propia disputa)
6. Usuario != dueño de la performanceRecord (dueño no vota en su disputa)
7. Usuario NO ha votado ya en esta disputa (unique constraint)
8. Registrar voto (APPROVE/REJECT)
9. Recalcular: si votos APPROVE >= 51% miembros activos → resolver APPROVED
10. Si resuelto APPROVED: soft delete PerformanceRecord, notificar FCM
11. Notificar FCM al creador de la disputa (voto recibido)
```

### cancelDispute
```typescript
// Solo si status = PENDING
// Permitido: creator, group owner, super admin
// Cambia status a CANCELLED, resolvedAt = now()
// Notificar FCM a creador y dueño de marca
```

### resolveDispute (Admin/Owner)
```typescript
// Solo GROUP_OWNER del grupo o SUPER_ADMIN
// status debe ser APPROVED, REJECTED, o CANCELLED
// Si APPROVED y estaba PENDING: soft delete record
// resolvedAt = now()
// Notificar FCM
```

## Resolución Automática (Lógica en Backend, no mutation pública)

```typescript
// En DisputeService.resolveIfThresholdMet(disputeId)
const activeMembers = await countActiveGroupMembers(groupId);
const approveVotes = await countApproveVotes(disputeId);
const threshold = Math.ceil(activeMembers * 0.51);

if (approveVotes >= threshold) {
  await approveDispute(disputeId); // Soft delete record, status APPROVED
}
```

## Subscriptions (GraphQL Subscriptions / WebSocket)

```graphql
type Subscription {
  # Disputa actualizada (voto, resolución, expiración)
  disputeUpdated(groupId: ID!): Dispute!
  
  # Nueva disputa en grupo
  disputeCreated(groupId: ID!): Dispute!
  
  # Voto recibido en disputa
  voteCast(disputeId: ID!): Vote!
}
```

**Eventos a emitir (via PubSub/Redis):**
- `DISPUTE_CREATED` → `disputeCreated(groupId)`
- `VOTE_CAST` → `disputeUpdated(groupId)` + `voteCast(disputeId)`
- `DISPUTE_RESOLVED` (APPROVED/REJECTED/CANCELLED/EXPIRED) → `disputeUpdated(groupId)`

## Tipos TypeScript Generados (Referencia)

```typescript
// Generados automáticamente desde schema.graphql
// @graphql-codegen/typescript

type Dispute = {
  id: string;
  status: DisputeStatus;
  group: Group;
  performanceRecord: PerformanceRecord;
  creator: User;
  votes: Vote[];
  voteCounts: VoteCounts;
  userVote: VoteType | null;
  canVote: boolean;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  expiresAt: Date;
  isExpired: boolean;
  timeRemaining: number | null;
};

type VoteCounts = {
  approve: number;
  reject: number;
  total: number;
  threshold: number;
  activeMembers: number;
  percentage: number;
};

type CreateDisputeInput = {
  performanceRecordId: string;
  groupId: string;
};

type VoteInput = {
  disputeId: string;
  type: VoteType;
};
```

## Ejemplos de Queries/Mutations

### Crear disputa
```graphql
mutation CreateDispute($input: CreateDisputeInput!) {
  createDispute(input: $input) {
    id
    status
    expiresAt
    performanceRecord {
      id
      value
      user { name }
    }
    creator { name }
    voteCounts {
      approve
      reject
      threshold
      activeMembers
      percentage
    }
  }
}

# Variables
{
  "input": {
    "performanceRecordId": "clx123...",
    "groupId": "clg456..."
  }
}
```

### Votar
```graphql
mutation VoteDispute($input: VoteInput!) {
  voteDispute(input: $input) {
    id
    type
    dispute {
      id
      status
      voteCounts {
        approve
        reject
        threshold
        percentage
      }
    }
  }
}

# Variables
{
  "input": {
    "disputeId": "cld789...",
    "type": "APPROVE"
  }
}
```

### Listar disputas del grupo
```graphql
query GroupDisputes($groupId: ID!, $input: DisputesQueryInput) {
  groupDisputes(groupId: $groupId, input: $input) {
    edges {
      node {
        id
        status
        createdAt
        expiresAt
        performanceRecord {
          id
          value
          exercise { name }
          user { name avatarUrl }
        }
        creator { name }
        voteCounts {
          approve
          reject
          percentage
        }
        userVote
        canVote
      }
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}
```

### Verificar disputa activa para marca
```graphql
query ActiveDisputeForRecord($performanceRecordId: ID!) {
  activeDisputeForRecord(performanceRecordId: $performanceRecordId) {
    id
    status
    voteCounts { approve reject percentage }
    userVote
    canVote
  }
}
```

## Criterios de aceptación (API)
- [ ] Schema GraphQL compila sin errores
- [ ] Types TypeScript generados correctamente
- [ ] Todas las queries resuelven con datos correctos
- [ ] Mutations validan permisos y reglas de negocio
- [ ] `voteCounts` calcula correctamente threshold y porcentaje
- [ ] `canVote` respeta: no creador, no dueño, miembro activo, disputa PENDING, no expirada, no votado
- [ ] `userVote` retorna voto del usuario actual o null
- [ ] Partial unique index evita disputa duplicada (error GraphQL claro)
- [ ] Subscriptions emiten eventos correctos
- [ ] Guards `@GroupMember`, `@Role` funcionan en resolvers
