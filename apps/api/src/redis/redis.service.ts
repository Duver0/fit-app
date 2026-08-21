import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: Redis | null = null

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST')
    if (host) {
      this.client = new Redis({
        host,
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD') || undefined,
        lazyConnect: false,
        enableOfflineQueue: false,
        connectTimeout: 5000,
        maxRetriesPerRequest: 3,
      })
      this.client.on('error', (err) => {
        this.logger.error(`Redis connection error: ${err.message}`)
      })
      this.client.on('connect', () => {
        this.logger.log('Redis connected')
      })
    } else {
      this.logger.warn('REDIS_HOST not configured — Redis disabled')
    }
  }

  get isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready'
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null
    return this.client!.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return
    if (ttlSeconds) {
      await this.client!.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.client!.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return
    await this.client!.del(key)
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return
    const keys = await this.client!.keys(pattern)
    if (keys.length > 0) {
      await this.client!.del(...keys)
    }
  }

  async ping(): Promise<string> {
    if (!this.isConnected) throw new Error('Redis not connected')
    return this.client!.ping()
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit()
    }
  }
}
