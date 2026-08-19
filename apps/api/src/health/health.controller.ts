import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import Redis from 'ioredis'

@Controller('health')
export class HealthController {
  private redis: Redis

  constructor(private prisma: PrismaService) {
    if (process.env.REDIS_HOST) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 5000,
      })
      this.redis.on('error', () => {
        // Silently handle Redis connection errors
      })
    }
  }

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
    if (this.redis) {
      try {
        await Promise.race([
          this.redis.ping(),
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
