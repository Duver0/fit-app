import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import Redis from 'ioredis'

@Controller('health')
export class HealthController {
  private redis: Redis

  constructor(private prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
    })
    this.redis.on('error', () => {
      // Silently handle Redis connection errors
    })
  }

  @Get()
  async check() {
    const checks: Record<string, string> = {}

    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    try {
      await this.redis.ping()
      checks.redis = 'ok'
    } catch {
      checks.redis = 'error'
    }

    const allOk = Object.values(checks).every(s => s === 'ok')
    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }
  }
}
