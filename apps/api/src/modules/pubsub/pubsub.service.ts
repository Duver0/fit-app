import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PubSub as GraphQLPubSub } from 'graphql-subscriptions'
import { PubSubEventMap, PubSubEventName } from './pubsub.types'
import Redis from 'ioredis'

/**
 * PubSub service that supports both in-memory and Redis adapters.
 *
 * Configuration:
 *   PUBSUB_ADAPTER=memory   → single-server dev (default)
 *   PUBSUB_ADAPTER=redis    → horizontal scaling in production
 *
 * Redis connection uses existing REDIS_HOST, REDIS_PORT, REDIS_PASSWORD env vars.
 */
@Injectable()
export class PubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(PubSubService.name)
  private readonly adapter: 'memory' | 'redis'

  // In-memory adapter
  private readonly pubSub = new GraphQLPubSub()

  // Redis adapter
  private publisher: Redis | null = null
  private subscriber: Redis | null = null
  private readonly listeners = new Map<string, Set<(payload: any) => void>>()

  constructor(
    @Optional() private config?: ConfigService,
  ) {
    this.adapter = (this.config?.get('PUBSUB_ADAPTER') as 'memory' | 'redis') || 'memory'

    if (this.adapter === 'redis') {
      this.initRedis()
    } else {
      this.logger.log('PubSub: using in-memory adapter (single-server)')
    }
  }

  private initRedis() {
    const host = this.config?.get('REDIS_HOST') || 'localhost'
    const port = parseInt(this.config?.get('REDIS_PORT') || '6379', 10)
    const password = this.config?.get('REDIS_PASSWORD') || undefined

    const redisConfig = { host, port, password, maxRetriesPerRequest: 3 }

    this.publisher = new Redis(redisConfig)
    this.subscriber = new Redis(redisConfig)

    this.subscriber.on('message', (channel: string, message: string) => {
      const callbacks = this.listeners.get(channel)
      if (callbacks) {
        const payload = JSON.parse(message)
        callbacks.forEach((cb) => cb(payload))
      }
    })

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', err)
    })

    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', err)
    })

    this.logger.log(`PubSub: using Redis adapter at ${host}:${port}`)
  }

  /**
   * Publish an event to all subscribers of the given topic.
   */
  publish<K extends PubSubEventName>(
    topic: K,
    payload: PubSubEventMap[K],
  ): void {
    if (this.adapter === 'redis' && this.publisher) {
      const message = JSON.stringify({ [topic]: payload })
      this.publisher.publish(topic, message)
    } else {
      this.pubSub.publish(topic, { [topic]: payload })
    }
  }

  /**
   * Get an async iterator for a topic.
   */
  asyncIterator<K extends PubSubEventName>(topic: K) {
    if (this.adapter === 'redis' && this.subscriber) {
      const callbacks = this.listeners.get(topic) || new Set()
      this.listeners.set(topic, callbacks)
      this.subscriber.subscribe(topic)

      return {
        [Symbol.asyncIterator]: () => ({
          next: () => {
            return new Promise<IteratorResult<any>>((resolve) => {
              const handler = (payload: any) => {
                callbacks.delete(handler)
                if (callbacks.size === 0) {
                  this.subscriber?.unsubscribe(topic)
                  this.listeners.delete(topic)
                }
                resolve({ value: payload, done: false })
              }
              callbacks.add(handler)
            })
          },
          return: () => {
            callbacks.clear()
            this.subscriber?.unsubscribe(topic)
            this.listeners.delete(topic)
            return Promise.resolve({ value: undefined, done: true })
          },
        }),
      }
    }

    return this.pubSub.asyncIterableIterator(topic)
  }

  /**
   * Cleanup on module destroy.
   */
  async onModuleDestroy() {
    if (this.adapter === 'redis') {
      await this.publisher?.quit()
      await this.subscriber?.quit()
    } else {
      await this.pubSub.asyncIterableIterator('').return?.()
    }
  }
}
