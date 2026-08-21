import { Test, TestingModule } from '@nestjs/testing'
import { RolesGuard, ROLES_KEY } from './roles.guard'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../../prisma/prisma.service'
import { ForbiddenException, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector
  let prisma: PrismaService

  function createMockContext(user: any, args: any = {}, setHandlerAndClass = true): ExecutionContext {
    const mockGqlCtx = {
      getContext: jest.fn().mockReturnValue({ req: { user } }),
      getArgs: jest.fn().mockReturnValue(args),
    }
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlCtx as any)

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as unknown as ExecutionContext

    return context
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
        {
          provide: PrismaService,
          useValue: {
            groupMember: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    guard = module.get<RolesGuard>(RolesGuard)
    reflector = module.get<Reflector>(Reflector)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('canActivate', () => {
    it('should return true when no roles are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null)

      const context = createMockContext({ id: 'user-1', role: 'USER' })
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should allow SUPER_ADMIN user for SUPER_ADMIN required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN'])

      const context = createMockContext({ id: 'user-1', role: 'SUPER_ADMIN' })
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should deny USER for SUPER_ADMIN required role without groupId', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN'])

      const context = createMockContext({ id: 'user-1', role: 'USER' }, {})
      const result = await guard.canActivate(context)
      expect(result).toBe(false)
    })

    it('should deny USER for SUPER_ADMIN required role with groupId (not member)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN'])
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)

      const context = createMockContext({ id: 'user-1', role: 'USER' }, { groupId: 'group-1' })
      const result = await guard.canActivate(context)
      expect(result).toBe(false)
    })

    it('should allow OWNER when user is group owner and OWNER role required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER'])
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue({
        id: 'gm-1',
        userId: 'user-1',
        groupId: 'group-1',
        role: 'OWNER',
        joinedAt: new Date(),
        isActive: true,
      })

      const context = createMockContext({ id: 'user-1', role: 'USER' }, { groupId: 'group-1' })
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should deny MEMBER when OWNER role is required and user is not the owner', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER'])
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue({
        id: 'gm-2',
        userId: 'user-2',
        groupId: 'group-1',
        role: 'MEMBER',
        joinedAt: new Date(),
        isActive: true,
      })

      const context = createMockContext({ id: 'user-2', role: 'USER' }, { groupId: 'group-1' })
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Only the group owner can perform this action',
      )
    })

    it('should allow MEMBER when MEMBER role is required and user is a member', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MEMBER'])
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue({
        id: 'gm-2',
        userId: 'user-2',
        groupId: 'group-1',
        role: 'MEMBER',
        joinedAt: new Date(),
        isActive: true,
      })

      const context = createMockContext({ id: 'user-2', role: 'USER' }, { groupId: 'group-1' })
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
    })

    it('should throw ForbiddenException when user is not a member of the group', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MEMBER'])
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)

      const context = createMockContext({ id: 'user-3', role: 'USER' }, { groupId: 'group-1' })
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
      await expect(guard.canActivate(context)).rejects.toThrow('Not a member of this group')
    })

    it('should throw ForbiddenException when no user in context', async () => {
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

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
    })

    it('should extract groupId from input.groupId', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER'])
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue({
        id: 'gm-1',
        userId: 'user-1',
        groupId: 'group-1',
        role: 'OWNER',
        joinedAt: new Date(),
        isActive: true,
      })

      const context = createMockContext(
        { id: 'user-1', role: 'USER' },
        { input: { groupId: 'group-1' } },
      )
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', userId: 'user-1' },
      })
    })

    it('should extract groupId from args.id', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['OWNER'])
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue({
        id: 'gm-1',
        userId: 'user-1',
        groupId: 'group-id-from-arg',
        role: 'OWNER',
        joinedAt: new Date(),
        isActive: true,
      })

      const context = createMockContext(
        { id: 'user-1', role: 'USER' },
        { id: 'group-id-from-arg' },
      )
      const result = await guard.canActivate(context)
      expect(result).toBe(true)
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-id-from-arg', userId: 'user-1' },
      })
    })
  })
})
