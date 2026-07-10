import { Resolver, Mutation, Query, Args, Int } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Group, GroupConnection, UserConnection, ExerciseConnection } from '../../common/models'
import { UpdateGroupInput } from '../groups/dto/group.input'

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
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
  async adminDeleteGroup(@Args('id') id: string) {
    return this.adminService.deleteGroup(id)
  }

  @Mutation(() => Boolean)
  async adminDeleteUser(@Args('id') id: string) {
    return this.adminService.deleteUser(id)
  }

  @Mutation(() => Boolean)
  async adminDeleteExercise(@Args('id') id: string) {
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
