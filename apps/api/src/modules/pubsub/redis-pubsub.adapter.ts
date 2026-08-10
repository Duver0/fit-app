import { Logger } from '@nestjs/common'
import Redis from 'ioredis'
import { PubSubEventMap, PubSubEventName } from './pubsub.types'

/**
 * Redis-backed PubSub adapter for horizontal scaling.
 * Use this in production when running multiple API instances.
 *
 * To activate, set PUBSUB_ADAPTER=redis in your environment and
 * replace the in-memory PubSubService with this adapter in PubSubModule.
 */
export class RedisPubSubAdapter {
  private readonly logger = new Logger(RedisPubSubAdapter.name)
  private readonly publisher: Redis
  private readonly subscriber: Redis
  private readonly listeners = new Map<string, Set<(payload: any) => void>>()

  constructor(config: { host: string; port: number; password?: string }) {
    this.publisher = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      maxRetriesPerRequest: 3,
    })

    this.subscriber = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      maxRetriesPerRequest: 3,
    })

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

    this.logger.log('Redis PubSub adapter initialized')
  }

  /**
   * Publish an event to a Redis channel.
   */
  publish<K extends PubSubEventName>(topic: K, payload: PubSubEventMap[K]): void {
    const message = JSON.stringify({ [topic]: payload })
    this.publisher.publish(topic, message)
  }

  /**
   * Subscribe to a Redis channel and return an async iterator.
   */
  asyncIterator<K extends PubSubEventName>(topic: K) {
    const callbacks = this.listeners.get(topic) || new Set()
    this.listeners.set(topic, callbacks)

    // Subscribe to the Redis channel
    this.subscriber.subscribe(topic)

    return {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          return new Promise<IteratorResult<any>>((resolve) => {
            const handler = (payload: any) => {
              callbacks.delete(handler)
              if (callbacks.size === 0) {
                this.subscriber.unsubscribe(topic)
                this.listeners.delete(topic)
              }
              resolve({ value: payload, done: false })
            }
            callbacks.add(handler)
          })
        },
        return: () => {
          callbacks.clear()
          this.subscriber.unsubscribe(topic)
          this.listeners.delete(topic)
          return Promise.resolve({ value: undefined, done: true })
        },
      }),
    }
  }

  /**
   * Cleanup connections.
   */
  async disconnect() {
    await this.publisher.quit()
    await this.subscriber.quit()
  }
}
