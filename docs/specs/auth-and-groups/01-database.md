# Auth & Groups — Database

> **Status: ✅ COMPLETADO** — Prisma schema generado, migraciones listas, backend compila.

## Objetivo
Definir el esquema de datos completo en Prisma que soporte autenticación, grupos, membresías, ejercicios, marcas de rendimiento, disputas y administración global.

## Modelos

### User
```prisma
model User {
  id            String    @id @default(uuid()) @db.Uuid
  auth0Id       String    @unique @map("auth0_id")
  email         String    @unique
  phone         String?   @map("phone")
  name          String
  avatarUrl     String?   @map("avatar_url") @db.Text
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  memberships   GroupMember[]
  performances  PerformanceRecord[]
  disputeVotes  DisputeVote[]

  @@map("users")
}

enum UserRole {
  USER
  SUPER_ADMIN
}
```

### Group
```prisma
model Group {
  id          String    @id @default(uuid()) @db.Uuid
  name        String
  description String?   @db.Text
  avatarUrl   String?   @map("avatar_url") @db.Text
  ownerId     String    @map("owner_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  owner       User        @relation(fields: [ownerId], references: [id])
  members     GroupMember[]
  exercises   Exercise[]

  @@map("groups")
}
```

### GroupMember (relación N:N con metadata)
```prisma
model GroupMember {
  id        String          @id @default(uuid()) @db.Uuid
  userId    String          @map("user_id") @db.Uuid
  groupId   String          @map("group_id") @db.Uuid
  role      GroupMemberRole @default(MEMBER)
  joinedAt  DateTime        @default(now()) @map("joined_at")

  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  group     Group   @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([userId, groupId])
  @@index([groupId])
  @@index([userId])
  @@map("group_members")
}

enum GroupMemberRole {
  OWNER
  MEMBER
}
```

### Invitation
```prisma
model Invitation {
  id        String        @id @default(uuid()) @db.Uuid
  groupId   String        @map("group_id") @db.Uuid
  inviterId String        @map("inviter_id") @db.Uuid
  inviteeEmail String     @map("invitee_email")
  status    InviteStatus  @default(PENDING)
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  inviter User  @relation(fields: [inviterId], references: [id])

  @@index([groupId])
  @@index([inviteeEmail])
  @@map("invitations")
}

enum InviteStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
}
```

### Exercise
```prisma
model Exercise {
  id          String   @id @default(uuid()) @db.Uuid
  groupId     String   @map("group_id") @db.Uuid
  name        String
  unit        String   @default("kg")  // kg, reps, min, seg, m
  createdBy   String   @map("created_by") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  group       Group               @relation(fields: [groupId], references: [id], onDelete: Cascade)
  creator     User                @relation(fields: [createdBy], references: [id])
  performances PerformanceRecord[]

  @@unique([groupId, name])
  @@index([groupId])
  @@map("exercises")
}
```

### PerformanceRecord
```prisma
model PerformanceRecord {
  id         String    @id @default(uuid()) @db.Uuid
  exerciseId String    @map("exercise_id") @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  groupId    String    @map("group_id") @db.Uuid
  value      Float
  recordedAt DateTime  @default(now()) @map("recorded_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  exercise  Exercise       @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  user      User           @relation(fields: [userId], references: [id])
  group     Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  disputes  Dispute[]

  @@unique([exerciseId, userId, groupId])  // 1 marca por ejercicio por usuario por grupo
  @@index([groupId, exerciseId, value DESC])
  @@index([userId])
  @@map("performance_records")
}
```

### Dispute
```prisma
model Dispute {
  id               String        @id @default(uuid()) @db.Uuid
  performanceId    String        @map("performance_id") @db.Uuid
  initiatedById    String        @map("initiated_by_id") @db.Uuid
  reason           String        @db.Text
  status           DisputeStatus @default(OPEN)
  createdAt        DateTime      @default(now()) @map("created_at")
  resolvedAt       DateTime?     @map("resolved_at")
  expiresAt        DateTime      @map("expires_at")  // now + 7 days

  performance      PerformanceRecord @relation(fields: [performanceId], references: [id], onDelete: Cascade)
  initiator        User              @relation(fields: [initiatedById], references: [id])
  votes            DisputeVote[]

  @@index([performanceId])
  @@index([status])
  @@map("disputes")
}

enum DisputeStatus {
  OPEN
  APPROVED    // ≥51% votó a favor de eliminar
  REJECTED    // <51% al expirar
}

model DisputeVote {
  id         String      @id @default(uuid()) @db.Uuid
  disputeId  String      @map("dispute_id") @db.Uuid
  userId     String      @map("user_id") @db.Uuid
  vote       Boolean     // true = refutar (eliminar marca), false = mantener
  createdAt  DateTime    @default(now()) @map("created_at")

  dispute    Dispute     @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  user       User        @relation(fields: [userId], references: [id])

  @@unique([disputeId, userId])
  @@index([disputeId])
  @@map("dispute_votes")
}
```

## Índices adicionales
- `performance_records`: índice compuesto `(groupId, exerciseId, value DESC)` para rankings eficientes.
- `disputes`: índice en `(status, expiresAt)` para job de expiración.
- `invitations`: índice en `(inviteeEmail)` para busqueda rápida al aceptar.

## Migraciones
- `20260623000001_init`: Creación de todas las tablas y enums.
- `20260623000002_add_rankings_view` (opcional): Vista materializada de rankings si hay problemas de performance.

## Dependencias
- Ninguna. Este es el primer paso.
