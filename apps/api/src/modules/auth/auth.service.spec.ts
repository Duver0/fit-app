import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { UnauthorizedException, ConflictException } from '@nestjs/common'
import { UserRole } from '@prisma/client'

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}))

import * as bcrypt from 'bcryptjs'

describe('AuthService', () => {
  let service: AuthService
  let prisma: PrismaService

  const mockUser = {
    id: 'user-1',
    auth0Id: 'local|test@test.com',
    email: 'test@test.com',
    name: 'Test User',
    phone: null,
    avatarUrl: null,
    passwordHash: 'hashed-password',
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
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prisma = module.get<PrismaService>(PrismaService)
    jest.clearAllMocks()
  })

  describe('validateUser', () => {
    it('should return user when auth0Id exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      const result = await service.validateUser('local|test@test.com')
      expect(result).toEqual(mockUser)
    })

    it('should throw UnauthorizedException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      await expect(service.validateUser('nonexistent')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('register', () => {
    it('should create user with hashed password and return token', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser)

      const result = await service.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      })

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          auth0Id: 'local|test@test.com',
          email: 'test@test.com',
          name: 'Test User',
          phone: undefined,
          passwordHash: 'hashed-password',
        },
      })
      expect(result.accessToken).toBe('mock-jwt-token')
      expect(result.user).not.toHaveProperty('passwordHash')
    })

    it('should throw ConflictException when email already exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      await expect(service.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      })).rejects.toThrow(ConflictException)
    })
  })

  describe('loginWithEmail', () => {
    it('should return token for valid credentials', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await service.loginWithEmail({
        email: 'test@test.com',
        password: 'password123',
      })
      expect(result.accessToken).toBe('mock-jwt-token')
      expect(result.user).not.toHaveProperty('passwordHash')
    })

    it('should throw for invalid email', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      await expect(service.loginWithEmail({
        email: 'wrong@test.com',
        password: 'password123',
      })).rejects.toThrow(UnauthorizedException)
    })

    it('should throw for wrong password', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(service.loginWithEmail({
        email: 'test@test.com',
        password: 'wrong-password',
      })).rejects.toThrow(UnauthorizedException)
    })

    it('should throw when user has no passwordHash', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockUser, passwordHash: null })
      await expect(service.loginWithEmail({
        email: 'test@test.com',
        password: 'password123',
      })).rejects.toThrow(UnauthorizedException)
    })
  })

})
