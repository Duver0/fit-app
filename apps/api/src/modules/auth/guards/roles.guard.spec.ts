import { Test, TestingModule } from '@nestjs/testing'
import { RolesGuard, ROLES_KEY } from './roles.guard'
import { Reflector } from '@nestjs/core'
import { ForbiddenException, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector

  function createMockContext(user: any, args: any = {}): ExecutionContext {
    const mockGqlCtx = {
      getContext: jest.fn().mockReturnValue({ req: { user } }),
      getArgs: jest.fn().mockReturnValue(args),
    }
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlCtx as any)

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile()

    guard = module.get<RolesGuard>(RolesGuard)
    reflector = module.get<Reflector>(Reflector)
  })

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null)

      const context = createMockContext({ id: 'user-1', role: 'USER' })
      const result = guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should return true when empty roles array is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([])

      const context = createMockContext({ id: 'user-1', role: 'USER' })
      const result = guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should allow SUPER_ADMIN for any required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN'])

      const context = createMockContext({ id: 'user-1', role: 'SUPER_ADMIN' })
      const result = guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should allow SUPER_ADMIN even when OWNER is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER'])

      const context = createMockContext({ id: 'user-1', role: 'SUPER_ADMIN' })
      const result = guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should allow USER when USER role is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER'])

      const context = createMockContext({ id: 'user-1', role: 'USER' })
      const result = guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should deny USER when SUPER_ADMIN role is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN'])

      const context = createMockContext({ id: 'user-1', role: 'USER' })
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should throw ForbiddenException when no user in context', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN'])

      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({ req: {} }),
        getArgs: jest.fn().mockReturnValue({}),
      }
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlCtx as any)

      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('should deny USER when OWNER role is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER'])

      const context = createMockContext({ id: 'user-1', role: 'USER' })
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })
  })
})
