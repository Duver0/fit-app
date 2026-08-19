import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { PrismaService } from '../../prisma/prisma.service'
import { UserRole } from '@prisma/client'

describe('UsersService', () => {
  let service: UsersService
  let prisma: PrismaService

  const mockUser = {
    id: 'user-1',
    auth0Id: 'local|test@test.com',
    email: 'test@test.com',
    name: 'Test User',
    phone: null,
    avatarUrl: null,
    passwordHash: null,
    role: UserRole.USER,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    routineEnabled: false,
    singleGroupAutoEnter: false,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      const result = await service.findById('user-1')
      expect(result).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    })

    it('should return null when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      const result = await service.findById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('findByAuth0Id', () => {
    it('should return user by auth0Id', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      const result = await service.findByAuth0Id('local|test@test.com')
      expect(result).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { auth0Id: 'local|test@test.com' },
      })
    })

    it('should return null when auth0Id not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      const result = await service.findByAuth0Id('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('should update user fields', async () => {
      const updates = { name: 'Updated Name', phone: '+1234567890' }
      const updatedUser = { ...mockUser, ...updates }
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser)

      const result = await service.updateProfile('user-1', updates)
      expect(result.name).toBe('Updated Name')
      expect(result.phone).toBe('+1234567890')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updates,
      })
    })

    it('should update avatarUrl only', async () => {
      const updatedUser = { ...mockUser, avatarUrl: 'https://example.com/avatar.jpg' }
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser)

      const result = await service.updateProfile('user-1', {
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg')
    })
  })

  describe('findAll', () => {
    const mockUsers = [
      { ...mockUser, id: 'user-1', name: 'User 1' },
      { ...mockUser, id: 'user-2', name: 'User 2' },
      { ...mockUser, id: 'user-3', name: 'User 3' },
    ]

    it('should paginate correctly with default values', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue(mockUsers)
      jest.spyOn(prisma.user, 'count').mockResolvedValue(3)

      const result = await service.findAll()
      expect(result.items).toHaveLength(3)
      expect(result.totalCount).toBe(3)
      expect(result.currentPage).toBe(1)
      expect(result.totalPages).toBe(1)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should paginate with custom page and limit', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUsers[0]])
      jest.spyOn(prisma.user, 'count').mockResolvedValue(10)

      const result = await service.findAll(2, 3)
      expect(result.items).toHaveLength(1)
      expect(result.currentPage).toBe(2)
      expect(result.totalPages).toBe(4)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        skip: 3,
        take: 3,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty items when page exceeds total', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([])
      jest.spyOn(prisma.user, 'count').mockResolvedValue(3)

      const result = await service.findAll(10, 20)
      expect(result.items).toHaveLength(0)
      expect(result.totalCount).toBe(3)
      expect(result.currentPage).toBe(10)
      expect(result.totalPages).toBe(1)
    })
  })
})
