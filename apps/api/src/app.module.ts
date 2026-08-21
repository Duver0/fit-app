import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'
import depthLimit = require('graphql-depth-limit')
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { GroupsModule } from './modules/groups/groups.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { ExercisesModule } from './modules/exercises/exercises.module'
import { ExerciseCategoriesModule } from './modules/exercise-categories/exercise-categories.module'
import { PerformanceModule } from './modules/performance/performance.module'
import { RankingModule } from './modules/ranking/ranking.module'
import { DisputesModule } from './modules/disputes/disputes.module'
import { GroupImagesModule } from './modules/group-images/group-image.module'
import { AdminModule } from './modules/admin/admin.module'
import { RoutinesModule } from './modules/routines/routines.module'
import { HealthModule } from './health/health.module'
import { CommonServicesModule } from './common/services/common-services.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    RedisModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      introspection: true,
      context: ({ req, res }: { req: any; res: any }) => ({ req, res }),
      validationRules: [depthLimit(7)],
    }),
    PrismaModule,
    CommonServicesModule,
    HealthModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    InvitationsModule,
    ExercisesModule,
    ExerciseCategoriesModule,
    PerformanceModule,
    RankingModule,
    DisputesModule,
    GroupImagesModule,
    AdminModule,
    RoutinesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
