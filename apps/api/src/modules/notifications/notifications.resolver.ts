import { Resolver, Mutation, Query, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../../common/models'
import { DeviceToken } from './dto/device-token.type'
import { RegisterDeviceTokenInput } from './dto/register-device.input'
import { RegisterWebPushSubscriptionInput } from './dto/register-web-push.input'

@Resolver()
export class NotificationsResolver {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * Get VAPID public key (no auth required - needed before subscribing)
   */
  @Query(() => String)
  vapidPublicKey(): string {
    return this.notificationsService.getVapidPublicKey()
  }

  /**
   * Register a native device token (Expo)
   */
  @Mutation(() => DeviceToken)
  @UseGuards(GqlAuthGuard)
  async registerDeviceToken(
    @CurrentUser() user: User,
    @Args('input') input: RegisterDeviceTokenInput,
  ) {
    return this.notificationsService.registerToken(user.id, input.token, input.platform)
  }

  /**
   * Register a web push subscription (from browser)
   */
  @Mutation(() => DeviceToken)
  @UseGuards(GqlAuthGuard)
  async registerWebPushSubscription(
    @CurrentUser() user: User,
    @Args('input') input: RegisterWebPushSubscriptionInput,
  ) {
    return this.notificationsService.registerWebPushSubscription(user.id, input)
  }

  /**
   * Remove a device token
   */
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async removeDeviceToken(@Args('token') token: string) {
    await this.notificationsService.removeToken(token)
    return true
  }
}
