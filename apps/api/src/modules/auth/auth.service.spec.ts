import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { UnauthorizedException } from '@nestjs/common'
import { UserRole } from '@prisma/client'

describe('AuthService', () => {
  let service: AuthService
  let prisma: PrismaService
  let jwtService: JwtService

  const mockUser = {
    id: 'user-1',
    auth0Id: 'auth0|test@test.com',
    email: 'test@test.com',
    name: 'Test User',
    phone: null,
    avatarUrl: null,
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prisma = module.get<PrismaService>(PrismaService)
    jwtService = module.get<JwtService>(JwtService)
  })

  describe('validateUser', () => {
    it('should return user when auth0Id exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      const result = await service.validateUser('auth0|test@test.com')
      expect(result).toEqual(mockUser)
    })

    it('should throw UnauthorizedException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      await expect(service.validateUser('nonexistent')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('register', () => {
    it('should create user and return token', async () => {
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser)
      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      })
      expect(result.accessToken).toBe('mock-jwt-token')
      expect(result.user).toEqual(mockUser)
    })
  })

  describe('loginWithEmail', () => {
    it('should return token for valid credentials', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      const result = await service.loginWithEmail({
        email: 'test@test.com',
        password: 'password123',
      })
      expect(result.accessToken).toBe('mock-jwt-token')
    })

    it('should throw for invalid email', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      await expect(service.loginWithEmail({
        email: 'wrong@test.com',
        password: 'password123',
      })).rejects.toThrow(UnauthorizedException)
    })
  })
})
