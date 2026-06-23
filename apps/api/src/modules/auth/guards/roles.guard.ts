import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'
import { PrismaService } from '../../../prisma/prisma.service'

export const ROLES_KEY = 'roles'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles) return true

    const ctx = GqlExecutionContext.create(context)
    const { user } = ctx.getContext().req
    const args = ctx.getArgs()

    if (!user) throw new ForbiddenException()

    if (requiredRoles.includes('SUPER_ADMIN') && user.role === 'SUPER_ADMIN') {
      return true
    }

    const groupId = args.groupId || args.input?.groupId || args.id
    if (!groupId && requiredRoles.includes('SUPER_ADMIN')) {
      return user.role === 'SUPER_ADMIN'
    }

    if (groupId) {
      const membership = await this.prisma.groupMember.findFirst({
        where: { groupId, userId: user.id },
      })

      if (!membership && requiredRoles.includes('SUPER_ADMIN')) {
        return user.role === 'SUPER_ADMIN'
      }

      if (!membership) throw new ForbiddenException('Not a member of this group')

      if (requiredRoles.includes('OWNER') && membership.role !== 'OWNER') {
        throw new ForbiddenException('Only the group owner can perform this action')
      }

      if (requiredRoles.includes('MEMBER')) {
        return true
      }
    }

    if (requiredRoles.includes('SUPER_ADMIN')) {
      return user.role === 'SUPER_ADMIN'
    }

    return true
  }
}
