import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query(() => User)
  async me(@CurrentUser() user: User) {
    return this.usersService.findById(user.id)
  }

  @Query(() => [User])
  async searchUsers(
    @Args('query') query: string,
    @Args('excludeGroupId', { nullable: true }) excludeGroupId?: string,
  ) {
    return this.usersService.search(query, excludeGroupId)
  }

  @Mutation(() => User)
  async updateProfile(
    @CurrentUser() user: User,
    @Args('name', { nullable: true }) name?: string,
    @Args('phone', { nullable: true }) phone?: string,
  ) {
    return this.usersService.updateProfile(user.id, { name, phone })
  }
}
