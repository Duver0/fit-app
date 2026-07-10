import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { GroupsService } from './groups.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Group } from '../../common/models'
import { CreateGroupInput, UpdateGroupInput } from './dto/group.input'
import { User } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class GroupsResolver {
  constructor(private groupsService: GroupsService) {}

  @Query(() => [Group])
  async myGroups(@CurrentUser() user: User) {
    return this.groupsService.findByUser(user.id)
  }

  @Query(() => Group)
  async group(@Args('id') id: string) {
    return this.groupsService.findById(id)
  }

  @Query(() => [Group])
  async groupMembers(@Args('groupId') groupId: string) {
    const group = await this.groupsService.findById(groupId)
    return group.members
  }

  @Mutation(() => Group)
  async createGroup(
    @CurrentUser() user: User,
    @Args('input') input: CreateGroupInput,
  ) {
    return this.groupsService.create(user.id, input)
  }

  @Mutation(() => Group)
  async updateGroup(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateGroupInput,
  ) {
    return this.groupsService.update(id, user.id, input)
  }

  @Mutation(() => Boolean)
  async deleteGroup(@CurrentUser() user: User, @Args('id') id: string) {
    return this.groupsService.delete(id, user.id)
  }

  @Mutation(() => Boolean)
  async leaveGroup(@CurrentUser() user: User, @Args('groupId') groupId: string) {
    return this.groupsService.leaveGroup(groupId, user.id)
  }

  @Mutation(() => Boolean)
  async removeMember(
    @CurrentUser() user: User,
    @Args('groupId') groupId: string,
    @Args('userId') userId: string,
  ) {
    return this.groupsService.removeMember(groupId, userId, user.id)
  }
}
