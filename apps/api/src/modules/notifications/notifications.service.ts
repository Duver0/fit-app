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

/**
 * Notifications service — Web Push only (PWA).
 * Uses VAPID keys + web-push library to send push notifications
 * to the browser's Service Worker.
 */
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

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webPush.setVapidDetails(
        vapidEmail,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      )
      this.logger.log('✅ Web Push (VAPID) initialized')
    } else {
      this.logger.error('❌ VAPID keys NOT configured — Web Push will NOT work!')
      this.logger.error('   Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env')
    }
  }

  getVapidPublicKey(): string {
    return this.vapidPublicKey
  }

  /**
   * Register a web push subscription from the browser.
   * The endpoint is used as the unique token identifier.
   */
  async registerWebPushSubscription(userId: string, subscription: WebPushSubscription) {
    this.logger.log(`📝 Registering web push for user ${userId}`)
    this.logger.log(`   Endpoint: ${subscription.endpoint?.substring(0, 60)}...`)

    const subscriptionJson = subscription as unknown as Prisma.InputJsonValue

    try {
      const result = await this.prisma.deviceToken.upsert({
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
      this.logger.log(`✅ Web push registered, id: ${result.id}`)
      return result
    } catch (error) {
      this.logger.error('❌ Failed to register web push:', error)
      throw error
    }
  }

  async removeToken(token: string) {
    this.logger.log(`🗑️ Deactivating token`)
    return this.prisma.deviceToken.updateMany({
      where: { token },
      data: { active: false },
    })
  }

  /**
   * Send a push notification to all group members (except the author).
   * Only sends to active web push subscriptions.
   */
  async sendPushToGroup(params: {
    excludeUserId: string
    groupId: string
    title: string
    body: string
    data?: Record<string, unknown>
  }) {
    this.logger.log(`📤 Sending push to group ${params.groupId}`)
    this.logger.log(`   "${params.title}" — ${params.body}`)

    // Get all active web push subscriptions for group members (except author)
    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        active: true,
        platform: 'web',
        subscriptionData: { not: Prisma.JsonNull },
        user: {
          memberships: {
            some: { groupId: params.groupId, isActive: true },
          },
          id: { not: params.excludeUserId },
        },
      },
      include: {
        user: { select: { name: true } },
      },
    })

    if (tokens.length === 0) {
      this.logger.warn('⚠️ No active web push subscriptions found for group members')
      this.logger.warn('   Members need to open the PWA in their browser and allow notifications')
      return { sent: 0 }
    }

    this.logger.log(`   Found ${tokens.length} subscription(s):`)
    tokens.forEach((t, i) => {
      this.logger.log(`   ${i + 1}. ${t.user.name}`)
    })

    const payload = JSON.stringify({
      title: params.title,
      body: params.body,
      data: params.data,
    })

    let sentCount = 0
    const errors: string[] = []

    for (const tokenRecord of tokens) {
      try {
        const subscription = tokenRecord.subscriptionData as unknown as WebPushSubscription
        await webPush.sendNotification(subscription, payload)
        this.logger.log(`   ✅ Sent to ${tokenRecord.user.name}`)
        sentCount++
      } catch (error: any) {
        const errorMsg = `${tokenRecord.user.name}: ${error.message}`
        this.logger.error(`   ❌ Failed: ${errorMsg}`)
        errors.push(errorMsg)

        // Deactivate expired subscriptions (410 Gone)
        if (error.statusCode === 410) {
          this.logger.warn(`   🗑️ Deactivating expired subscription for ${tokenRecord.user.name}`)
          await this.removeToken(tokenRecord.token)
        }
      }
    }

    this.logger.log(`📊 Result: ${sentCount}/${tokens.length} sent`)
    return { sent: sentCount, total: tokens.length, errors }
  }
}
