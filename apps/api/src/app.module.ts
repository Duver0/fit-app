import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { GroupsModule } from './modules/groups/groups.module'
import { InvitationsModule } from './modules/invitations/invitations.module'
import { ExercisesModule } from './modules/exercises/exercises.module'
import { PerformanceModule } from './modules/performance/performance.module'
import { RankingModule } from './modules/ranking/ranking.module'
import { DisputesModule } from './modules/disputes/disputes.module'
import { GroupImagesModule } from './modules/group-images/group-image.module'
import { AdminModule } from './modules/admin/admin.module'
import { HealthModule } from './health/health.module'
import { CommonServicesModule } from './common/services/common-services.module'
import { join } from 'path'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      introspection: true,
      context: ({ req, res }: { req: any; res: any }) => ({ req, res }),
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    PrismaModule,
    CommonServicesModule,
    HealthModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    InvitationsModule,
    ExercisesModule,
    PerformanceModule,
    RankingModule,
    DisputesModule,
    GroupImagesModule,
    AdminModule,
  ],
})
export class AppModule {}
