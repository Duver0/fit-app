import { PrismaClient } from '@prisma/client'

export interface ResolutionResult {
  resolved: number
  approved: number
  rejected: number
  details: { id: string; outcome: 'APPROVED' | 'REJECTED' }[]
}

/**
 * Resuelve las disputas vencidas (status OPEN y expiresAt <= now).
 * Extraído de `DisputeResolutionProcessor` para poder invocarse tanto desde
 * el cron de NestJS (entornos con proceso residente) como desde un endpoint
 * HTTP serverless (Vercel), sin depender del `ScheduleModule`.
 *
 * Lógica unificada con DisputesService.vote():
 * - Votos de aprobación: vote === true
 * - Votos de rechazo: vote === false
 * - Mayoría simple: realVotes > fakeVotes Y realVotes >= ceil(eligibleCount * 0.51)
 * - Soft-delete del performance record (no hard-delete)
 */
export async function resolveExpiredDisputes(
  prisma: PrismaClient,
): Promise<ResolutionResult> {
  const now = new Date()

  const expired = await prisma.dispute.findMany({
    where: {
      status: 'OPEN',
      expiresAt: { lte: now },
    },
    include: {
      votes: true,
      performance: true,
    },
  })

  const result: ResolutionResult = {
    resolved: 0,
    approved: 0,
    rejected: 0,
    details: [],
  }

  for (const dispute of expired) {
    const groupId = dispute.performance.groupId

    // Contar votos: aprobación (true) vs rechazo (false)
    const realVotes = dispute.votes.filter((v: any) => v.vote === true).length
    const fakeVotes = dispute.votes.filter((v: any) => v.vote === false).length

    // Elegibles: miembros del grupo que tienen al menos un performance record activo
    const eligibleCount = await prisma.groupMember.count({
      where: {
        groupId,
        isActive: true,
        user: {
          performances: {
            some: { deletedAt: null },
          },
        },
      },
    })

    // Mayoría simple: más votos a favor que en contra Y al menos 51% de elegibles
    const majorityReached = eligibleCount > 0 &&
      realVotes > fakeVotes &&
      realVotes >= Math.ceil(eligibleCount * 0.51)

    if (majorityReached) {
      // Aprobada: soft-delete del registro, disputa RESOLVED
      await prisma.$transaction([
        prisma.dispute.update({
          where: { id: dispute.id },
          data: { status: 'APPROVED', resolvedAt: now },
        }),
        prisma.performanceRecord.update({
          where: { id: dispute.performanceId },
          data: { deletedAt: now, deletedByDisputeId: dispute.id, disputeResult: 'APPROVED' },
        }),
      ])
      result.approved++
      result.details.push({ id: dispute.id, outcome: 'APPROVED' })
    } else {
      // Rechazada: sin cambios al registro, disputa REJECTED
      await prisma.dispute.update({
        where: { id: dispute.id },
        data: { status: 'REJECTED', resolvedAt: now },
      })
      result.rejected++
      result.details.push({ id: dispute.id, outcome: 'REJECTED' })
    }
    result.resolved++
  }

  return result
}
