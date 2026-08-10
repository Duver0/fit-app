import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../prisma/prisma.service'

/**
 * Guard for authenticating WebSocket subscription connections.
 * Extracts JWT from connectionParams sent during WS handshake.
 */
@Injectable()
export class SubscriptionAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context)
    const graphqlContext = ctx.getContext()

    // For subscriptions, the connection params are in the context
    const connectionParams = graphqlContext.connectionParams
    const token = connectionParams?.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new UnauthorizedException('No authentication token provided')
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      })

      // Attach user to the socket context for downstream use
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })

      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      graphqlContext.req = graphqlContext.req || {}
      graphqlContext.req.user = user
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
