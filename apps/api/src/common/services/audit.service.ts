import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    action: string
    entity: string
    entityId: string
    actorId: string
    metadata?: Record<string, any>
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        actorId: params.actorId,
        metadata: params.metadata || {},
      },
    })
  }
}
