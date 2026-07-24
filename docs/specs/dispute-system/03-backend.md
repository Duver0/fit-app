# Dispute System — 03 Backend Services

## Objetivo
Implementar la lógica de negocio, servicios, validaciones, eventos y jobs para el sistema de disputas.

## Dependencias
- `01-database.md` — Modelos Prisma
- `02-api.md` — Contratos GraphQL
- `auth-and-groups` services: `GroupMemberService`, `Auth0Service`
- `performance` services: `PerformanceRecordService`
- `notifications` (Bull + FCM): `NotificationQueueService`

## Estructura de Módulo (NestJS Feature Module)

```
src/modules/disputes/
├── disputes.module.ts
├── disputes.resolver.ts
├── disputes.service.ts
├── disputes.gateway.ts          # Subscriptions (WebSocket)
├── dto/
│   ├── create-dispute.input.ts
│   ├── vote-dispute.input.ts
│   ├── dispute-filter.input.ts
│   └── disputes-query.input.ts
├── guards/
│   ├── dispute-owner.guard.ts
│   ├── group-active-member.guard.ts
│   └── dispute-active.guard.ts
├── events/
│   ├── dispute-created.event.ts
│   ├── vote-cast.event.ts
│   ├── dispute-resolved.event.ts
│   └── disputes.event-emitter.ts
├── jobs/
│   ├── dispute-expiration.job.ts
│   └── dispute-expiration.processor.ts
├── interfaces/
│   ├── dispute-stats.interface.ts
│   └── vote-counts.interface.ts
└── disputes.service.spec.ts
```

## Servicios Principales

### DisputesService

```typescript
@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private groupMemberService: GroupMemberService,
    private performanceRecordService: PerformanceRecordService,
    private notificationQueue: NotificationQueueService,
    private eventEmitter: EventEmitter2,
    private pubSub: PubSub,
  ) {}

  // ========== QUERIES ==========

  async findById(id: string, userId: string): Promise<DisputeWithStats> {
    const dispute = await this.prisma.dispute.findUniqueOrThrow({
      where: { id },
      include: this.disputeInclude(userId),
    });
    this.checkGroupAccess(dispute.groupId, userId);
    return this.mapToGraphQL(dispute, userId);
  }

  async findGroupDisputes(
    groupId: string,
    userId: string,
    input: DisputesQueryInput
  ): Promise<Connection<DisputeWithStats>> {
    this.checkGroupAccess(groupId, userId);
    // Build where, cursor pagination, orderBy
    const [edges, totalCount] = await Promise.all([
      this.prisma.dispute.findMany({ ... }),
      this.prisma.dispute.count({ where }),
    ]);
    return this.toConnection(edges, totalCount, input);
  }

  async findActiveGroupDisputes(groupId: string, userId: string): Promise<DisputeWithStats[]> {
    this.checkGroupAccess(groupId, userId);
    return this.prisma.dispute.findMany({
      where: { groupId, status: 'PENDING', expiresAt: { gt: new Date() } },
      include: this.disputeInclude(userId),
      orderBy: { createdAt: 'desc' },
    }).then(d => d.map(d => this.mapToGraphQL(d, userId)));
  }

  async findMyDisputes(userId: string, input: DisputesQueryInput): Promise<Connection<DisputeWithStats>> {
    // where: { creatorId: userId }
  }

  async findMyVotedDisputes(userId: string, input: DisputesQueryInput): Promise<Connection<DisputeWithStats>> {
    // where: { votes: { some: { voterId: userId } } }
  }

  async findActiveDisputeForRecord(recordId: string, userId: string): Promise<DisputeWithStats | null> {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        performanceRecordId: recordId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: this.disputeInclude(userId),
    });
    if (dispute) this.checkGroupAccess(dispute.groupId, userId);
    return dispute ? this.mapToGraphQL(dispute, userId) : null;
  }

  async getDisputeStats(disputeId: string, userId: string): Promise<VoteCounts> {
    const dispute = await this.findById(disputeId, userId);
    return this.calculateVoteCounts(dispute);
  }

  // ========== MUTATIONS ==========

  async createDispute(userId: string, input: CreateDisputeInput): Promise<DisputeWithStats> {
    const { performanceRecordId, groupId } = input;

    // 1. Validaciones
    const member = await this.groupMemberService.getActiveMember(groupId, userId);
    if (!member) throw new ForbiddenException('Not an active member of this group');

    const record = await this.performanceRecordService.findById(performanceRecordId);
    if (!record || record.groupId !== groupId) {
      throw new NotFoundException('Performance record not found in this group');
    }
    if (record.deletedAt) throw new BadRequestException('Record already deleted');
    if (record.userId === userId) throw new BadRequestException('Cannot dispute your own record');

    // Verificar disputa activa existente (race condition handled by unique index)
    const existing = await this.prisma.dispute.findFirst({
      where: { performanceRecordId, status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    if (existing) throw new ConflictException('Record already has an active dispute');

    // 2. Crear disputa
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    const dispute = await this.prisma.dispute.create({
      data: {
        groupId,
        performanceRecordId,
        creatorId: userId,
        expiresAt,
      },
      include: this.disputeInclude(userId),
    });

    // 3. Eventos y notificaciones
    await this.emitDisputeCreated(dispute);
    await this.notifyDisputeCreated(dispute, record);

    return this.mapToGraphQL(dispute, userId);
  }

  async voteDispute(userId: string, input: VoteInput): Promise<Vote> {
    const { disputeId, type } = input;

    // 1. Validaciones
    const dispute = await this.prisma.dispute.findUniqueOrThrow({
      where: { id: disputeId },
      include: { votes: { where: { voterId: userId } } },
    });

    if (dispute.status !== 'PENDING') throw new BadRequestException('Dispute not pending');
    if (dispute.expiresAt < new Date()) throw new BadRequestException('Dispute expired');
    if (dispute.creatorId === userId) throw new ForbiddenException('Creator cannot vote');
    if (dispute.performanceRecord.userId === userId) throw new ForbiddenException('Record owner cannot vote');
    if (dispute.votes.length > 0) throw new ConflictException('Already voted');

    const member = await this.groupMemberService.getActiveMember(dispute.groupId, userId);
    if (!member) throw new ForbiddenException('Not an active group member');

    // 2. Crear voto (race condition handled by unique constraint)
    const vote = await this.prisma.vote.create({
      data: { disputeId, voterId: userId, type },
      include: { voter: true },
    });

    // 3. Recalcular y resolver si cumple umbral
    await this.checkAndResolveDispute(disputeId);

    // 4. Eventos
    await this.emitVoteCast(disputeId, vote);
    await this.notifyVoteCast(dispute, vote);

    return vote;
  }

  async cancelDispute(userId: string, disputeId: string): Promise<DisputeWithStats> {
    const dispute = await this.prisma.dispute.findUniqueOrThrow({ where: { id: disputeId } });
    
    if (dispute.status !== 'PENDING') throw new BadRequestException('Only pending disputes can be cancelled');
    
    const canCancel = dispute.creatorId === userId || 
      await this.groupMemberService.isOwnerOrAdmin(dispute.groupId, userId);
    if (!canCancel) throw new ForbiddenException('Only creator or group owner can cancel');

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
      include: this.disputeInclude(userId),
    });

    await this.emitDisputeResolved(updated, 'CANCELLED');
    await this.notifyDisputeResolved(updated, 'CANCELLED');

    return this.mapToGraphQL(updated, userId);
  }

  async resolveDispute(userId: string, disputeId: string, status: DisputeStatus): Promise<DisputeWithStats> {
    const dispute = await this.prisma.dispute.findUniqueOrThrow({ where: { id: disputeId } });
    
    const isAdmin = await this.groupMemberService.isOwnerOrAdmin(dispute.groupId, userId);
    const isSuperAdmin = await this.auth0Service.isSuperAdmin(userId);
    if (!isAdmin && !isSuperAdmin) throw new ForbiddenException('Only group owner/admin can resolve');

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      throw new BadRequestException('Invalid resolution status');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dispute.update({
        where: { id: disputeId },
        data: { status, resolvedAt: new Date() },
        include: this.disputeInclude(userId),
      });

      if (status === 'APPROVED' && d.performanceRecord) {
        await tx.performanceRecord.update({
          where: { id: d.performanceRecordId },
          data: { deletedAt: new Date(), deletedByDisputeId: d.id },
        });
      }

      return d;
    });

    await this.emitDisputeResolved(updated, status);
    await this.notifyDisputeResolved(updated, status);

    return this.mapToGraphQL(updated, userId);
  }

  // ========== LÓGICA INTERNA ==========

  private async checkAndResolveDispute(disputeId: string): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { _count: { select: { votes: { where: { type: 'APPROVE' } } } } },
    });

    if (!dispute || dispute.status !== 'PENDING') return;

    const activeMembers = await this.groupMemberService.countActiveMembers(dispute.groupId);
    const approveVotes = dispute._count.votes;
    const threshold = Math.ceil(activeMembers * 0.51);

    if (approveVotes >= threshold) {
      await this.resolveDisputeAutomatically(disputeId);
    }
  }

  private async resolveDisputeAutomatically(disputeId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id: disputeId },
        data: { status: 'APPROVED', resolvedAt: new Date() },
        include: { performanceRecord: true },
      });

      if (dispute.performanceRecord) {
        await tx.performanceRecord.update({
          where: { id: dispute.performanceRecordId },
          data: { deletedAt: new Date(), deletedByDisputeId: dispute.id },
        });
      }
    });

    await this.emitDisputeResolved({ id: disputeId, status: 'APPROVED' }, 'APPROVED');
    await this.notifyDisputeResolved({ id: disputeId, status: 'APPROVED' }, 'APPROVED');
  }

  // ========== HELPERS ==========

  private disputeInclude(userId: string) {
    return {
      group: true,
      performanceRecord: { include: { exercise: true, user: true } },
      creator: true,
      votes: { include: { voter: true } },
    };
  }

  private mapToGraphQL(dispute: any, userId: string): DisputeWithStats {
    const voteCounts = this.calculateVoteCounts(dispute);
    const userVote = dispute.votes.find(v => v.voterId === userId)?.type || null;
    const canVote = this.canUserVote(dispute, userId);

    return {
      ...dispute,
      voteCounts,
      userVote,
      canVote,
      isExpired: dispute.expiresAt < new Date(),
      timeRemaining: dispute.status === 'PENDING' 
        ? Math.max(0, Math.floor((dispute.expiresAt.getTime() - Date.now()) / 1000))
        : null,
    };
  }

  private calculateVoteCounts(dispute: any): VoteCounts {
    const approve = dispute.votes.filter(v => v.type === 'APPROVE').length;
    const reject = dispute.votes.filter(v => v.type === 'REJECT').length;
    const total = approve + reject;
    // activeMembers se calcula en query o se pasa desde service
    const activeMembers = dispute._activeMembersCount || 0;
    const threshold = Math.ceil(activeMembers * 0.51);
    const percentage = activeMembers > 0 ? (approve / activeMembers) * 100 : 0;

    return { approve, reject, total, threshold, activeMembers, percentage };
  }

  private canUserVote(dispute: any, userId: string): boolean {
    if (dispute.status !== 'PENDING') return false;
    if (dispute.expiresAt < new Date()) return false;
    if (dispute.creatorId === userId) return false;
    if (dispute.performanceRecord.userId === userId) return false;
    if (dispute.votes.some(v => v.voterId === userId)) return false;
    // Verificar miembro activo se hace en guard/service
    return true;
  }

  private async checkGroupAccess(groupId: string, userId: string): Promise<void> {
    const member = await this.groupMemberService.getActiveMember(groupId, userId);
    if (!member) throw new ForbiddenException('Not a member of this group');
  }
}
```

### DisputeExpirationJob (Bull Queue)

```typescript
// jobs/dispute-expiration.processor.ts
@Processor('dispute-expiration')
export class DisputeExpirationProcessor {
  constructor(
    private disputesService: DisputesService,
    private notificationQueue: NotificationQueueService,
    private eventEmitter: EventEmitter2,
    private pubSub: PubSub,
  ) {}

  @Cron(CronExpression.EVERY_HOUR) // Cada hora
  async handleExpiredDisputes() {
    const expired = await this.prisma.dispute.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      include: { performanceRecord: true, group: true },
    });

    for (const dispute of expired) {
      await this.expireDispute(dispute);
    }
  }

  private async expireDispute(dispute: Dispute) {
    await this.prisma.dispute.update({
      where: { id: dispute.id },
      data: { status: 'REJECTED', resolvedAt: new Date() },
    });

    await this.eventEmitter.emit('dispute.resolved', {
      disputeId: dispute.id,
      status: 'REJECTED',
      reason: 'EXPIRED',
    });

    await this.notificationQueue.add('dispute-expired', {
      disputeId: dispute.id,
      groupId: dispute.groupId,
      creatorId: dispute.creatorId,
      recordOwnerId: dispute.performanceRecord.userId,
    });

    this.pubSub.publish(`disputeUpdated:${dispute.groupId}`, {
      disputeUpdated: { ...dispute, status: 'REJECTED' },
    });
  }
}
```

### Guards

```typescript
// guards/group-active-member.guard.ts
@Injectable()
export class GroupActiveMemberGuard implements CanActivate {
  constructor(private groupMemberService: GroupMemberService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user.sub; // from JWT
    const groupId = req.body?.input?.groupId || req.params?.groupId;
    
    if (!groupId) return false;
    
    const member = await this.groupMemberService.getActiveMember(groupId, userId);
    return !!member;
  }
}

// guards/dispute-owner.guard.ts
@Injectable()
export class DisputeOwnerGuard implements CanActivate {
  constructor(private disputesService: DisputesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user.sub;
    const disputeId = req.body?.input?.disputeId || req.params?.disputeId;
    
    const dispute = await this.disputesService.findById(disputeId, userId);
    return dispute.creatorId === userId;
  }
}
```

### Eventos (EventEmitter2)

```typescript
// events/disputes.event-emitter.ts
@Injectable()
export class DisputesEventEmitter {
  constructor(private eventEmitter: EventEmitter2) {}

  emitDisputeCreated(dispute: Dispute) {
    this.eventEmitter.emit('dispute.created', {
      disputeId: dispute.id,
      groupId: dispute.groupId,
      creatorId: dispute.creatorId,
      recordOwnerId: dispute.performanceRecord.userId,
      expiresAt: dispute.expiresAt,
    });
  }

  emitVoteCast(disputeId: string, vote: Vote) {
    this.eventEmitter.emit('vote.cast', {
      disputeId,
      voteId: vote.id,
      voterId: vote.voterId,
      type: vote.type,
    });
  }

  emitDisputeResolved(disputeId: string, status: DisputeStatus, reason?: string) {
    this.eventEmitter.emit('dispute.resolved', { disputeId, status, reason });
  }
}

// Listeners en notifications module
@OnEvent('dispute.created')
async handleDisputeCreated(payload: DisputeCreatedPayload) {
  await this.fcm.sendToUser(payload.creatorId, {
    title: 'Disputa creada',
    body: `Tu registro de ${payload.exerciseName} está en disputa`,
    data: { type: 'DISPUTE_CREATED', disputeId: payload.disputeId },
  });
  // Notificar a dueño del registro y owner del grupo
}

@OnEvent('vote.cast')
async handleVoteCast(payload: VoteCastPayload) {
  // Notificar a creador de disputa: "Tu disputa recibió un voto"
}

@OnEvent('dispute.resolved')
async handleDisputeResolved(payload: DisputeResolvedPayload) {
  // Notificar según status: 'APPROVED' -> "Tu disputa fue aprobada, el registro fue eliminado"
  // 'REJECTED' -> "Tu disputa fue rechazada"
  // 'EXPIRED' -> "Tu disputa expiró sin votos suficientes"
}
```

## Cálculos y Reglas de Negocio

### Umbral 51% (Mayoría absoluta de miembros ACTIVOS)
```typescript
const activeMembers = await this.groupMemberService.countActiveMembers(groupId);
const threshold = Math.ceil(activeMembers * 0.51);
// Ejemplos:
// 3 miembros -> 2 votos (66.7%)
// 4 miembros -> 3 votos (75%)
// 5 miembros -> 3 votos (60%)
// 10 miembros -> 6 votos (60%)
```

### Soft Delete PerformanceRecord
```typescript
// Al aprobar disputa:
await prisma.performanceRecord.update({
  where: { id: recordId },
  data: { 
    deletedAt: new Date(), 
    deletedByDisputeId: disputeId 
  },
});

// En queries de rankings/records:
where: { 
  deletedAt: null,  // Solo no eliminados
  // ...
}
```

### Expiración automática
- Job cron cada hora
- Cambia status PENDING -> REJECTED (reason: EXPIRED)
- Notifica a creador y dueño del registro

## Notificaciones FCM (via Bull Queue)

```typescript
// notifications/notification-queue.service.ts
@Injectable()
export class NotificationQueueService {
  constructor(@InjectQueue('notifications') private queue: Queue) {}

  async notifyDisputeCreated(dispute: Dispute, record: PerformanceRecord) {
    await this.queue.add('dispute-created', {
      disputeId: dispute.id,
      groupId: dispute.groupId,
      creatorId: dispute.creatorId,
      recordOwnerId: record.userId,
      groupOwnerId: (await this.groupService.getOwner(dispute.groupId)).userId,
      exerciseName: record.exercise.name,
      recordValue: record.value,
    });
  }

  async notifyVoteCast(dispute: Dispute, vote: Vote) {
    await this.queue.add('vote-cast', {
      disputeId: dispute.id,
      creatorId: dispute.creatorId,
      voterName: vote.voter.name,
      voteType: vote.type,
      currentPercentage: dispute.voteCounts.percentage,
    });
  }

  async notifyDisputeResolved(dispute: Dispute, status: DisputeStatus) {
    await this.queue.add('dispute-resolved', {
      disputeId: dispute.id,
      creatorId: dispute.creatorId,
      recordOwnerId: dispute.performanceRecord.userId,
      status,
      exerciseName: dispute.performanceRecord.exercise.name,
    });
  }
}
```

## Tests Unitarios (Referencia)

```typescript
// disputes.service.spec.ts
describe('DisputesService', () => {
  describe('createDispute', () => {
    it('should throw if user not active member', async () => {
      jest.spyOn(groupMemberService, 'getActiveMember').mockResolvedValue(null);
      await expect(service.createDispute(userId, input)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if disputing own record', async () => {
      jest.spyOn(groupMemberService, 'getActiveMember').mockResolvedValue(member);
      jest.spyOn(perfRecordService, 'findById').mockResolvedValue({ ...record, userId });
      await expect(service.createDispute(userId, input)).rejects.toThrow(BadRequestException);
    });

    it('should throw if record already has active dispute', async () => {
      jest.spyOn(prisma.dispute, 'findFirst').mockResolvedValue(existingDispute);
      await expect(service.createDispute(userId, input)).rejects.toThrow(ConflictException);
    });

    it('should create dispute and emit events', async () => {
      // setup mocks...
      const result = await service.createDispute(userId, input);
      expect(result.status).toBe('PENDING');
      expect(eventEmitter.emit).toHaveBeenCalledWith('dispute.created', expect.any(Object));
      expect(notificationQueue.add).toHaveBeenCalledWith('dispute-created', expect.any(Object));
    });
  });

  describe('voteDispute', () => {
    it('should throw if dispute not pending', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue({ ...dispute, status: 'APPROVED' });
      await expect(service.voteDispute(userId, input)).rejects.toThrow(BadRequestException);
    });

    it('should throw if user already voted', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue({ ...dispute, votes: [{ voterId: userId }] });
      await expect(service.voteDispute(userId, input)).rejects.toThrow(ConflictException);
    });

    it('should approve dispute when threshold met', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue({
        ...dispute,
        _count: { votes: 3 }, // 3 approve votes
      });
      jest.spyOn(groupMemberService, 'countActiveMembers').mockResolvedValue(5); // threshold = 3
      await service.voteDispute(userId, { disputeId, type: 'APPROVE' });
      expect(prisma.dispute.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'APPROVED', resolvedAt: expect.any(Date) },
      }));
    });
  });

  describe('checkAndResolveDispute', () => {
    it('should calculate threshold correctly', () => {
      // 3 active members -> ceil(3 * 0.51) = 2
      // 4 active members -> ceil(4 * 0.51) = 3
      // 5 active members -> ceil(5 * 0.51) = 3
      // 10 active members -> ceil(10 * 0.51) = 6
    });
  });
});
```

## Criterios de aceptación (Backend)
- [ ] `DisputesService` implementa todos los métodos CRUD + lógica de votos
- [ ] Validaciones de negocio en `createDispute` y `voteDispute`
- [ ] Cálculo correcto del umbral 51% (miembros ACTIVOS)
- [ ] Resolución automática al alcanzar umbral (transacción atómica)
- [ ] Soft delete de `PerformanceRecord` al aprobar
- [ ] Job cron expira disputas PENDING cada hora
- [ ] Guards: `@GroupActiveMember`, `@DisputeOwner`, `@DisputeActive`
- [ ] Eventos emitidos: `dispute.created`, `vote.cast`, `dispute.resolved`
- [ ] Notificaciones FCM encoladas en Bull para cada evento
- [ ] Subscriptions GraphQL publican eventos via PubSub
- [ ] Tests unitarios cubren happy paths y edge cases
- [ ] Índice parcial único previene disputa duplicada (race condition handled)
