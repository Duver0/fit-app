import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import * as webPush from 'web-push'
import { Prisma } from '@prisma/client'

interface WebPushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private vapidPublicKey: string
  private vapidPrivateKey: string

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.vapidPublicKey = this.configService.get('VAPID_PUBLIC_KEY', '')
    this.vapidPrivateKey = this.configService.get('VAPID_PRIVATE_KEY', '')
    const vapidEmail = this.configService.get('VAPID_EMAIL', 'mailto:fit-app@fitapp.com')

    // Initialize web-push with VAPID keys
    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webPush.setVapidDetails(
        vapidEmail,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      )
      this.logger.log('Web Push (VAPID) initialized successfully')
    } else {
      this.logger.warn('VAPID keys not configured. Web Push notifications will not work.')
    }
  }

  /**
   * Get VAPID public key for the frontend
   */
  getVapidPublicKey(): string {
    return this.vapidPublicKey
  }

  /**
   * Register a web push subscription (from browser)
   */
  async registerWebPushSubscription(userId: string, subscription: WebPushSubscription) {
    this.logger.log(`Registering web push subscription for user ${userId}`)

    // Convert to Prisma Json input
    const subscriptionJson = subscription as unknown as Prisma.InputJsonValue

    return this.prisma.deviceToken.upsert({
      where: { token: subscription.endpoint },
      update: {
        active: true,
        platform: 'web',
        userId,
        subscriptionData: subscriptionJson,
      },
      create: {
        userId,
        token: subscription.endpoint,
        platform: 'web',
        subscriptionData: subscriptionJson,
      },
    })
  }

  /**
   * Register a native device token (from Expo)
   */
  async registerToken(userId: string, token: string, platform: string) {
    this.logger.log(`Registering device token for user ${userId}`)

    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { active: true, platform, userId },
      create: { userId, token, platform },
    })
  }

  async removeToken(token: string) {
    this.logger.log(`Removing device token`)

    return this.prisma.deviceToken.updateMany({
      where: { token },
      data: { active: false },
    })
  }

  async sendPushToGroup(params: {
    excludeUserId: string
    groupId: string
    title: string
    body: string
    data?: Record<string, unknown>
  }) {
    this.logger.log(`Sending push notification to group ${params.groupId}`)

    // Get all active tokens for group members (except the author)
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        active: true,
        user: {
          memberships: {
            some: { groupId: params.groupId, isActive: true },
          },
          id: { not: params.excludeUserId },
        },
      },
    })

    if (tokens.length === 0) {
      this.logger.log('No device tokens found for group members')
      return { sent: 0 }
    }

    this.logger.log(`Found ${tokens.length} device tokens to send notifications`)

    const payload = JSON.stringify({
      title: params.title,
      body: params.body,
      data: params.data,
    })

    let sentCount = 0
    const errors: string[] = []

    for (const tokenRecord of tokens) {
      try {
        if (tokenRecord.platform === 'web' && tokenRecord.subscriptionData) {
          // Web Push - use stored subscription data
          const subscription = tokenRecord.subscriptionData as unknown as WebPushSubscription
          await webPush.sendNotification(subscription, payload)
          sentCount++
        } else if (tokenRecord.platform !== 'web') {
          // Expo Push (native apps)
          await this.sendExpoPush([{ to: tokenRecord.token, sound: 'default', ...JSON.parse(payload) }])
          sentCount++
        }
      } catch (error) {
        this.logger.error(`Failed to send push to token ${tokenRecord.token}: ${error.message}`)
        errors.push(error.message)

        // If the subscription is expired (410 Gone), deactivate it
        if (error.statusCode === 410) {
          await this.removeToken(tokenRecord.token)
        }
      }
    }

    this.logger.log(`Push notifications sent: ${sentCount}/${tokens.length}`)

    return { sent: sentCount, total: tokens.length, errors }
  }

  /**
   * Send push notifications via Expo Push API (for native apps)
   */
  private async sendExpoPush(messages: Record<string, unknown>[]) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      })

      const result = await response.json()
      return result
    } catch (error) {
      this.logger.error('Error sending Expo push notifications', error)
      throw error
    }
  }
}
