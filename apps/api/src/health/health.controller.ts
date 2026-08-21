import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {}

    // DB check (5s timeout)
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    // Redis check (5s timeout) — only if configured
    if (this.redisService.isConnected) {
      try {
        await Promise.race([
          this.redisService.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ])
        checks.redis = 'ok'
      } catch {
        checks.redis = 'error'
      }
    } else {
      checks.redis = 'not_configured'
    }

    // 'not_configured' (Redis ausente) cuenta como OK: sin Redis usamos
    // el adaptador en memoria, que es válido para una sola instancia.
    const allOk = Object.values(checks).every(s => s === 'ok' || s === 'not_configured')
    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }
  }
}
