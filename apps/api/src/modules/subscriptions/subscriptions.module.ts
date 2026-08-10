import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SubscriptionsResolver } from './subscriptions.resolver'
import { SubscriptionAuthGuard } from './guards/subscription-auth.guard'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [SubscriptionsResolver, SubscriptionAuthGuard],
  exports: [SubscriptionAuthGuard],
})
export class SubscriptionsModule {}
