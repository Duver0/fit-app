# Auth & Groups — Backend

> **Status: ✅ COMPLETADO** — Todos los servicios, guards, procesador de disputas, audit service y upload service implementados. Backend compila.

## Objetivo
Implementar servicios, lógica de negocio, validaciones, guards, y procesamiento asíncrono para toda la plataforma.

## Dependencias
- `01-database.md` (modelos Prisma)
- `02-api.md` (contratos GraphQL)

---

## Estructura de módulos

```
apps/api/src/modules/
├── auth/
│   ├── auth.module.ts
│   ├── auth.resolver.ts
│   ├── auth.service.ts
│   ├── guards/
│   │   ├── gql-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── dto/
│       ├── register.input.ts
│       └── login.input.ts
├── users/
│   ├── users.module.ts
│   ├── users.resolver.ts
│   ├── users.service.ts
│   └── dto/
│       └── update-profile.input.ts
├── groups/
│   ├── groups.module.ts
│   ├── groups.resolver.ts
│   ├── groups.service.ts
│   └── dto/
│       ├── create-group.input.ts
│       └── update-group.input.ts
├── invitations/
│   ├── invitations.module.ts
│   ├── invitations.resolver.ts
│   ├── invitations.service.ts
│   └── dto/
│       └── invite.input.ts
├── exercises/
│   ├── exercises.module.ts
│   ├── exercises.resolver.ts
│   ├── exercises.service.ts
│   └── dto/
│       └── create-exercise.input.ts
├── performance/
│   ├── performance.module.ts
│   ├── performance.resolver.ts
│   ├── performance.service.ts
│   └── dto/
│       └── upsert-performance.input.ts
├── disputes/
│   ├── disputes.module.ts
│   ├── disputes.resolver.ts
│   ├── disputes.service.ts
│   ├── processors/
│   │   └── dispute-resolution.processor.ts  # Bull consumer
│   └── dto/
│       ├── create-dispute.input.ts
│       └── vote.input.ts
├── admin/
│   ├── admin.module.ts
│   ├── admin.resolver.ts
│   └── admin.service.ts
└── ranking/
    ├── ranking.module.ts
    ├── ranking.resolver.ts
    ├── ranking.service.ts
    └── ranking.repository.ts  # SQL raw queries
```

---

## AuthService

### register(input: RegisterInput): AuthPayload
1. Verificar que email no exista en Auth0 ni en DB local.
2. Crear usuario en Auth0 (email + password).
3. Crear `User` en DB local con `auth0Id` del paso anterior.
4. Generar JWT y devolver `AuthPayload`.

### login(input: LoginInput): AuthPayload
1. Autenticar contra Auth0 con Resource Owner Password flow.
2. Buscar `User` por `auth0Id`.
3. Generar JWT y devolver.

### loginWithGoogle(idToken: string): AuthPayload
1. Verificar idToken con Google (biblioteca `google-auth-library`).
2. Extraer email, name, avatar.
3. Si no existe `User` con ese email → crear usuario en Auth0 + DB.
4. Si existe → login directo.
5. Devolver JWT.

### validateUser(payload: JwtPayload): User
1. Buscar `User` por `auth0Id` del payload.
2. Si no existe → throw UnauthorizedException.

---

## Guards

### GqlAuthGuard (NestJS + Passport)
- Estrategia JWT: extraer token del header `Authorization: Bearer <token>`.
- Validar con Auth0 JWKS endpoint.
- Inyectar `@CurrentUser()`.

### RolesGuard
- Leer metadatos `@Auth(requires: ...)` del resolver.
- Para `SUPER_ADMIN`: verificar `user.role === SUPER_ADMIN`.
- Para `OWNER`: extraer `groupId` de args, verificar que `user.id` sea owner en `GroupMember`.
- Para `MEMBER`: verificar que exista `GroupMember` con `userId` y `groupId`.

---

## GroupsService

### createGroup(userId, input): Group
1. Crear `Group` con `ownerId = userId`.
2. Crear `GroupMember` con `userId`, `groupId`, `role: OWNER`.
3. Si hay `avatarUrl` (Upload) → subir a R2 y guardar URL.

### updateGroup(userId, groupId, input): Group
- Solo `OWNER` o `SUPER_ADMIN` (validado por guard + service check).

### deleteGroup(groupId): boolean
- Soft delete opcional, o cascade real.
- `SUPER_ADMIN` puede borrar cualquier grupo; `OWNER` solo el suyo.

### leaveGroup(userId, groupId): boolean
1. Verificar que no sea OWNER (debe transferir propiedad o eliminar grupo primero).
2. Eliminar `GroupMember`.
3. Eliminar `PerformanceRecord` del usuario en ese grupo.

---

## InvitationsService

### inviteToGroup(groupId, inviteeEmail, inviterId): Invitation
1. Verificar que `inviteeEmail` no sea ya miembro.
2. Verificar que no haya invitation PENDING previa.
3. Crear `Invitation`.
4. Emitir evento → FCM push notification al invitado.

### acceptInvitation(invitationId, userId): GroupMember
1. Verificar que `invitation.status === PENDING` y el email coincida.
2. Crear `GroupMember` con `role: MEMBER`.
3. Marcar invitation como `ACCEPTED`.

---

## ExercisesService

### createExercise(input): Exercise
- Solo GROUP_OWNER puede crear (RolesGuard + verificación en service).
- Validar que no exista ejercicio con mismo nombre en el grupo (`@@unique([groupId, name])`).

---

## PerformanceService

### upsertPerformance(userId, input): PerformanceRecord
1. Verificar que el usuario es miembro del grupo del ejercicio.
2. Buscar `PerformanceRecord` existente por `(exerciseId, userId, groupId)`.
3. Si existe → `update` (actualizar value, recordedAt se mantiene, updatedAt cambia).
4. Si no existe → `create`.
5. Emitir evento `rankingUpdated` (subscription).

---

## RankingService

### getRanking(exerciseId, page, limit): RankingConnection
- Usa SQL raw con `RANK() OVER (ORDER BY value DESC)` sobre `performance_records`.
- Filtra por `exerciseId` y `groupId` (obtenido del exercise).
- Paginación offset-based.

### getTop3(groupId): [ExerciseRankingPreview]
- Para cada ejercicio del grupo, obtener top 3.
- Query: `SELECT * FROM (SELECT *, RANK() OVER (PARTITION BY exercise_id ORDER BY value DESC) as r FROM performance_records WHERE group_id = $1) sub WHERE r <= 3`

---

## DisputesService

### createDispute(userId, input): Dispute
1. Verificar que `userId` es miembro del grupo de la marca.
2. Verificar que no exista dispute OPEN para esa performance.
3. Crear `Dispute` con `expiresAt = now + 7 days`.
4. Emitir evento → notificaciones push a miembros del grupo.

### voteOnDispute(userId, disputeId, vote): DisputeVote
1. Verificar que el usuario es miembro del grupo.
2. Upsert voto (si ya votó, actualiza).
3. **Regla de negocio clave**: Calcular porcentaje actual.
   - `approvalPercentage = (votos true) / totalGroupMembers * 100`
   - Si `approvalPercentage >= 51` → `dispute.status = APPROVED` → eliminar `PerformanceRecord`.
   - Notificar a todos los miembros.

### DisputeResolutionProcessor (Bull worker)
- Job recurrente cada hora.
- Buscar disputes con `status = OPEN` y `expiresAt < now`.
- Si `approvalPercentage < 51` → marcar como `REJECTED`.
- Si `approvalPercentage >= 51` → marcar como `APPROVED` y eliminar record.

---

## AdminService

### adminDeleteGroup / adminUpdateGroup / adminDeleteUser / adminDeleteExercise
- Solo chequea `SUPER_ADMIN` (RolesGuard).
- Operaciones directas sobre Prisma.
- Audit log de cada acción (tabla `AuditLog` o servicio).

---

## UploadService (R2)
- Subir archivos a Cloudflare R2 (S3 SDK).
- Generar URL pública firmada o prefirmada.
- Usar `sharp` para redimensionar avatares a 256x256.

---

## AuditLog
```prisma
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  action    String
  entity    String   // "group", "user", "exercise", "performance"
  entityId  String
  actorId   String   @map("actor_id") @db.Uuid
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")

  @@index([entity, entityId])
  @@map("audit_logs")
}
```
- Se registra en cada operación administrativa y de mutación sensible.
