import { Test, TestingModule } from '@nestjs/testing'
import { GqlAuthGuard } from './gql-auth.guard'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

// Mock AuthGuard('jwt') base class
jest.mock('@nestjs/passport', () => {
  let mockCanActivate: jest.Mock

  class MockPassportGuard {
    canActivate = mockCanActivate
  }

  return {
    AuthGuard: jest.fn(() => {
      mockCanActivate = jest.fn().mockImplementation(async (context: ExecutionContext) => {
        const gqlCtx = GqlExecutionContext.create(context)
        const req = gqlCtx.getContext().req
        const token = req?.headers?.authorization?.replace('Bearer ', '')

        if (!token || token === 'invalid') {
          throw new UnauthorizedException()
        }
        return true
      })
      return MockPassportGuard
    }),
  }
})

describe('GqlAuthGuard', () => {
  let guard: GqlAuthGuard

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GqlAuthGuard],
    }).compile()

    guard = module.get<GqlAuthGuard>(GqlAuthGuard)
  })

  describe('getRequest', () => {
    it('should extract req from GQL execution context', () => {
      const mockReq = {
        headers: { authorization: 'Bearer valid-token' },
        user: { id: 'user-1', role: 'USER' },
      }
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({ req: mockReq }),
      }
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlCtx as any)

      const mockContext = {} as ExecutionContext
      const result = guard.getRequest(mockContext)
      expect(result).toBe(mockReq)
      expect(GqlExecutionContext.create).toHaveBeenCalledWith(mockContext)
    })
  })

  describe('canActivate', () => {
    it('should return true for valid token', async () => {
      const mockReq = {
        headers: { authorization: 'Bearer valid-token' },
        user: { id: 'user-1', role: 'USER' },
      }
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({ req: mockReq }),
        getArgs: jest.fn().mockReturnValue({}),
      }
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlCtx as any)

      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
      } as unknown as ExecutionContext

      const result = await guard.canActivate(mockContext)
      expect(result).toBe(true)
    })

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockReq = {
        headers: { authorization: 'Bearer invalid' },
      }
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({ req: mockReq }),
        getArgs: jest.fn().mockReturnValue({}),
      }
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlCtx as any)

      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
      } as unknown as ExecutionContext

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when no token is present', async () => {
      const mockReq = { headers: {} }
      const mockGqlCtx = {
        getContext: jest.fn().mockReturnValue({ req: mockReq }),
        getArgs: jest.fn().mockReturnValue({}),
      }
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlCtx as any)

      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
      } as unknown as ExecutionContext

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException)
    })
  })
})
