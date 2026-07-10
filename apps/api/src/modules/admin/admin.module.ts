import { Module } from '@nestjs/common'
import { AdminResolver } from './admin.resolver'
import { AdminService } from './admin.service'
import { GroupsModule } from '../groups/groups.module'
import { ExercisesModule } from '../exercises/exercises.module'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [GroupsModule, ExercisesModule, UsersModule],
  providers: [AdminResolver, AdminService],
})
export class AdminModule {}
