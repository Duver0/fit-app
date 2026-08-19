// api/cron/disputes.ts — Vercel serverless function invoked hourly (GitHub Action)
// to resolve expired disputes. Usa la lógica compartida (sin Nest/ScheduleModule).
import { PrismaClient } from '@prisma/client'
import { resolveExpiredDisputes } from '../../apps/api/src/modules/disputes/dispute-resolution.logic'

export default async function handler(req: any, res: any): Promise<void> {
  const secret = process.env.CRON_SECRET
  const auth = req.headers?.['authorization'] || ''

  if (!secret || auth !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }

  const prisma = new PrismaClient()
  try {
    const result = await resolveExpiredDisputes(prisma)
    res.status(200).json({ ok: true, ...result })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'unknown error' })
  } finally {
    await prisma.$disconnect()
  }
}
