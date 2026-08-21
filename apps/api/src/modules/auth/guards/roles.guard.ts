import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'

export const ROLES_KEY = 'roles'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles || requiredRoles.length === 0) return true

    const ctx = GqlExecutionContext.create(context)
    const { user } = ctx.getContext().req

    if (!user) throw new ForbiddenException('Not authenticated')

    // SUPER_ADMIN bypasses all role checks
    if (user.role === 'SUPER_ADMIN') return true

    // Check if any required role matches the user's role
    if (requiredRoles.includes(user.role)) return true

    throw new ForbiddenException('Insufficient permissions')
  }
}
