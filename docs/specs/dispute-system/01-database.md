# Dispute System — 01 Database Schema

## Objetivo
Definir el esquema de base de datos (Prisma) para el sistema de disputas: modelos, enums, relaciones, índices y migraciones.

## Dependencias
- `01-database.md` de `auth-and-groups` (modelos `User`, `Group`, `GroupMember`)
- `01-database.md` de `performance` (modelo `PerformanceRecord`, `Exercise`)

## Enums

```prisma
enum DisputeStatus {
  PENDING     // Disputa activa, recibiendo votos
  APPROVED    // Alcanzó 51% → marca eliminada
  REJECTED    // Expiró sin alcanzar 51% → marca intacta
  CANCELLED   // Cancelada por admin/superadmin
}

enum VoteType {
  APPROVE  // Vota a favor de eliminar la marca
  REJECT   // Vota en contra (mantener la marca)
}
```

## Modelos

### Dispute
```prisma
model Dispute {
  id              String       @id @default(cuid())
  status          DisputeStatus @default(PENDING)
  
  // Relaciones
  groupId         String
  group           Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  
  performanceRecordId String
  performanceRecord PerformanceRecord @relation(fields: [performanceRecordId], references: [id], onDelete: Cascade)
  
  creatorId       String
  creator         User         @relation("DisputeCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  
  // Votos
  votes           Vote[]
  
  // Metadatos
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  resolvedAt      DateTime?    // Cuándo se resolvió (aprobado/rechazado/expirado/cancelado)
  expiresAt       DateTime     // createdAt + 7 días (168 horas)
  
  // Índices
  @@index([groupId, status])
  @@index([performanceRecordId])
  @@index([creatorId])
  @@index([status, expiresAt]) // Para job de expiración
  @@index([groupId, createdAt])
}
```

### Vote
```prisma
model Vote {
  id          String   @id @default(cuid())
  type        VoteType
  
  // Relaciones
  disputeId   String
  dispute     Dispute  @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  
  voterId     String
  voter       User     @relation("VoteVoter", fields: [voterId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime @default(now())
  
  // Un voto por usuario por disputa
  @@unique([disputeId, voterId])
  @@index([disputeId])
  @@index([voterId])
}
```

### Modificaciones a modelos existentes

#### PerformanceRecord (en `performance` context)
```prisma
model PerformanceRecord {
  // ... campos existentes ...
  
  // NUEVO: Soft delete para disputas aprobadas
  deletedAt     DateTime?
  deletedByDisputeId String? // Referencia a la disputa que lo eliminó
  dispute       Dispute?    @relation(fields: [deletedByDisputeId], references: [id])
  
  // Índice para excluir eliminados en rankings
  @@index([deletedAt])
}
```

#### GroupMember (en `auth-and-groups` context)
```prisma
model GroupMember {
  // ... campos existentes ...
  
  // NUEVO: Para conteo de miembros activos en disputa
  isActive      Boolean   @default(true) // Para excluir miembros inactivos/baneados del conteo 51%
  
  @@index([groupId, isActive])
}
```

#### User (en `auth-and-groups` context)
```prisma
model User {
  // ... campos existentes ...
  
  // Relaciones nuevas
  disputesCreated   Dispute[] @relation("DisputeCreator")
  votes             Vote[]    @relation("VoteVoter")
}
```

## Migraciones

### Migración 1: Crear enums y modelos Dispute, Vote
```sql
-- Crear enums
CREATE TYPE "DisputeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "VoteType" AS ENUM ('APPROVE', 'REJECT');

-- Crear tabla Dispute
CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" "DisputeStatus" NOT NULL DEFAULT 'PENDING',
  "groupId" TEXT NOT NULL,
  "performanceRecordId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE,
  CONSTRAINT "Dispute_performanceRecordId_fkey" FOREIGN KEY ("performanceRecordId") REFERENCES "PerformanceRecord"("id") ON DELETE CASCADE,
  CONSTRAINT "Dispute_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Crear tabla Vote
CREATE TABLE "Vote" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "VoteType" NOT NULL,
  "disputeId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vote_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE,
  CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Índices
CREATE INDEX "Dispute_groupId_status_idx" ON "Dispute"("groupId", "status");
CREATE INDEX "Dispute_performanceRecordId_idx" ON "Dispute"("performanceRecordId");
CREATE INDEX "Dispute_creatorId_idx" ON "Dispute"("creatorId");
CREATE INDEX "Dispute_status_expiresAt_idx" ON "Dispute"("status", "expiresAt");
CREATE INDEX "Dispute_groupId_createdAt_idx" ON "Dispute"("groupId", "createdAt");
CREATE UNIQUE INDEX "Vote_disputeId_voterId_key" ON "Vote"("disputeId", "voterId");
CREATE INDEX "Vote_disputeId_idx" ON "Vote"("disputeId");
CREATE INDEX "Vote_voterId_idx" ON "Vote"("voterId");
```

### Migración 2: Agregar campos a PerformanceRecord
```sql
ALTER TABLE "PerformanceRecord" 
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedByDisputeId" TEXT;

ALTER TABLE "PerformanceRecord"
ADD CONSTRAINT "PerformanceRecord_deletedByDisputeId_fkey" 
FOREIGN KEY ("deletedByDisputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL;

CREATE INDEX "PerformanceRecord_deletedAt_idx" ON "PerformanceRecord"("deletedAt");
```

### Migración 3: Agregar isActive a GroupMember
```sql
ALTER TABLE "GroupMember" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "GroupMember_groupId_isActive_idx" ON "GroupMember"("groupId", "isActive");
```

## Índices compuestos clave

| Índice | Propósito |
|--------|-----------|
| `Dispute(groupId, status)` | Listar disputas activas de un grupo |
| `Dispute(performanceRecordId)` | Verificar si una marca ya tiene disputa activa |
| `Dispute(status, expiresAt)` | Job cron: encontrar disputas PENDING expiradas |
| `Dispute(groupId, createdAt)` | Listar historial de disputas del grupo |
| `Vote(disputeId, voterId) UNIQUE` | Un voto por usuario por disputa |
| `Vote(disputeId)` | Contar votos de una disputa |
| `PerformanceRecord(deletedAt)` | Excluir eliminados en rankings |
| `GroupMember(groupId, isActive)` | Contar miembros activos para umbral 51% |

## Validaciones a nivel BD (Constraints)

1. **Un voto por usuario por disputa**: `UNIQUE(disputeId, voterId)` en `Vote`
2. **Disputa única por marca activa**: Partial unique index en `Dispute` donde `status = 'PENDING'` y `performanceRecordId` único
   ```sql
   CREATE UNIQUE INDEX "Dispute_active_per_record" 
   ON "Dispute"("performanceRecordId") 
   WHERE "status" = 'PENDING';
   ```
3. **FK cascade**: Eliminar grupo → elimina disputas; eliminar disputa → elimina votos; eliminar marca → elimina disputa

## Cálculo del umbral 51%

```sql
-- Contar miembros activos del grupo (excluye owner? No, owner cuenta)
SELECT COUNT(*) FROM "GroupMember" 
WHERE "groupId" = $1 AND "isActive" = true;

-- Contar votos APPROVE en disputa
SELECT COUNT(*) FROM "Vote" 
WHERE "disputeId" = $1 AND "type" = 'APPROVE';

-- Verificar umbral: votesApprove * 100 >= activeMembers * 51
-- Usar aritmética entera para evitar float: votesApprove * 100 >= activeMembers * 51
```

## Soft Delete en PerformanceRecord

- Al aprobar disputa: `UPDATE "PerformanceRecord" SET "deletedAt" = NOW(), "deletedByDisputeId" = $disputeId WHERE "id" = $recordId`
- Rankings: `WHERE "deletedAt" IS NULL`
- Historial usuario: Puede mostrar eliminados con badge "Eliminado por disputa"

## Seed data para testing

```typescript
// seed-disputes.ts
const activeMembers = await prisma.groupMember.findMany({ 
  where: { groupId, isActive: true } 
});

// Crear disputa
const dispute = await prisma.dispute.create({
  data: {
    groupId,
    performanceRecordId: recordId,
    creatorId: memberId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
  }
});

// Votos de prueba
await prisma.vote.createMany({
  data: activeMembers.slice(0, 3).map(m => ({
    disputeId: dispute.id,
    voterId: m.userId,
    type: 'APPROVE',
  }))
});
```

## Criterios de aceptación (DB)
- [ ] Enum `DisputeStatus` con 4 valores
- [ ] Enum `VoteType` con 2 valores
- [ ] Modelo `Dispute` con todos los campos, relaciones e índices
- [ ] Modelo `Vote` con unique constraint `(disputeId, voterId)`
- [ ] Partial unique index: una disputa PENDING por performanceRecord
- [ ] `PerformanceRecord.deletedAt` y `deletedByDisputeId` con FK
- [ ] `GroupMember.isActive` con default true e índice
- [ ] Migraciones generadas y aplicables sin errores
- [ ] Índices compuestos para queries de disputa activa, expiración, votos
- [ ] FK cascades configurados correctamente
