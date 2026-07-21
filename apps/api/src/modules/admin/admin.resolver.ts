import { Resolver, Mutation, Query, Args, Int } from '@nestjs/graphql'
import { UseGuards, SetMetadata } from '@nestjs/common'
import { AdminService } from './admin.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { AdminGuard, ADMIN_ROLES_KEY } from '../../common/guards/admin.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Group, GroupConnection, UserConnection, ExerciseConnection, User } from '../../common/models'
import { UpdateGroupInput } from '../groups/dto/group.input'

@Resolver()
@UseGuards(GqlAuthGuard, AdminGuard)
@SetMetadata(ADMIN_ROLES_KEY, ['SUPER_ADMIN'])
export class AdminResolver {
  constructor(private adminService: AdminService) {}

  @Query(() => GroupConnection)
  async adminGroups(
    @Args('page', { nullable: true, type: () => Int }) page?: number,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
  ) {
    return this.adminService.listGroups(page || 1, limit || 20)
  }

  @Query(() => UserConnection)
  async adminUsers(
    @Args('page', { nullable: true, type: () => Int }) page?: number,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
  ) {
    return this.adminService.listUsers(page || 1, limit || 20)
  }

  @Query(() => ExerciseConnection)
  async adminExercises(
    @Args('page', { nullable: true, type: () => Int }) page?: number,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
  ) {
    return this.adminService.listExercises(page || 1, limit || 20)
  }

  @Mutation(() => Boolean)
  async adminDeleteGroup(
    @CurrentUser() admin: User,
    @Args('id') id: string,
  ) {
    return this.adminService.deleteGroup(id, admin.id)
  }

  @Mutation(() => Boolean)
  async adminDeleteUser(
    @CurrentUser() admin: User,
    @Args('id') id: string,
  ) {
    return this.adminService.deleteUser(id, admin.id)
  }

  @Mutation(() => Boolean)
  async adminDeleteExercise(
    @CurrentUser() admin: User,
    @Args('id') id: string,
  ) {
    return this.adminService.deleteExercise(id)
  }

  @Mutation(() => Group)
  async adminUpdateGroup(
    @Args('id') id: string,
    @Args('input') input: UpdateGroupInput,
  ) {
    return this.adminService.updateGroup(id, input)
  }
}
