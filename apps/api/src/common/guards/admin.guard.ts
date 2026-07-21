import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'

export const ADMIN_ROLES_KEY = 'adminRoles'

/**
 * Guard exclusivo para operaciones de administrador.
 * No tiene nada de la lógica de grupos (groupId, membership, etc.)
 * que tiene RolesGuard y que causaba confusión.
 *
 * Simplemente verifica que el usuario tenga rol SUPER_ADMIN.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles) return true

    const ctx = GqlExecutionContext.create(context)
    const { user } = ctx.getContext().req

    if (!user) throw new ForbiddenException()

    // El admin resolver requiere SUPER_ADMIN
    if (requiredRoles.includes('SUPER_ADMIN')) {
      if (user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Solo los administradores pueden realizar esta acción')
      }
      return true
    }

    return true
  }
}
