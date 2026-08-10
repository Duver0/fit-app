import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PubSubService } from './pubsub.service'

/**
 * Global PubSub module - provides the PubSub singleton to all modules.
 *
 * Configuration via environment variables:
 *   PUBSUB_ADAPTER=memory  → single-server dev (default)
 *   PUBSUB_ADAPTER=redis   → horizontal scaling in production
 *
 * Redis connection uses: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [PubSubService],
  exports: [PubSubService],
})
export class PubSubModule {}
