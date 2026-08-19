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
    const membersCount = await prisma.groupMember.count({
      where: { groupId: dispute.performance.groupId },
    })

    const approveVotes = dispute.votes.filter((v: any) => v.vote).length
    const percentage = membersCount > 0 ? (approveVotes / membersCount) * 100 : 0

    if (percentage >= 51) {
      await prisma.$transaction([
        prisma.dispute.update({
          where: { id: dispute.id },
          data: { status: 'APPROVED', resolvedAt: now },
        }),
        prisma.performanceRecord.delete({
          where: { id: dispute.performanceId },
        }),
      ])
      result.approved++
      result.details.push({ id: dispute.id, outcome: 'APPROVED' })
    } else {
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
