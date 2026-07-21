import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { PrismaService } from '../../prisma/prisma.service'
import { GroupsService } from '../groups/groups.service'
import { ExercisesService } from '../exercises/exercises.service'
import { UsersService } from '../users/users.service'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { UploadService } from '../../common/services/upload.service'
import { UserRole } from '@prisma/client'

describe('AdminService', () => {
  let service: AdminService
  let prisma: PrismaService
  let groupsService: GroupsService
  let exercisesService: ExercisesService
  let usersService: UsersService

  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    avatarUrl: null,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { members: 5 },
    owner: { id: 'user-1', name: 'Owner' },
    members: [],
    memberCount: 5,
    exercises: [],
  }

  const mockUser = {
    id: 'user-1',
    auth0Id: 'local|admin@test.com',
    email: 'admin@test.com',
    name: 'Admin',
    phone: null,
    avatarUrl: null,
    passwordHash: null,
    role: UserRole.SUPER_ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
            group: {
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
            exercise: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: GroupsService,
          useValue: {
            adminDelete: jest.fn(),
            adminUpdate: jest.fn(),
            adminFindAll: jest.fn(),
          },
        },
        {
          provide: ExercisesService,
          useValue: {
            adminDelete: jest.fn(),
            adminFindAll: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: UploadService,
          useValue: {
            deleteFileByUrl: jest.fn(),
            deleteFilesByUrls: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
    prisma = module.get<PrismaService>(PrismaService)
    groupsService = module.get<GroupsService>(GroupsService)
    exercisesService = module.get<ExercisesService>(ExercisesService)
    usersService = module.get<UsersService>(UsersService)
  })

  describe('deleteGroup', () => {
    it('should delete a group by id', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(mockGroup as any)
      jest.spyOn(prisma.group, 'delete').mockResolvedValue(mockGroup as any)

      const result = await service.deleteGroup('group-1', 'admin-1')
      expect(result).toBe(true)
      expect(prisma.group.findUnique).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        include: { exercises: { select: { imageUrl: true } } },
      })
      expect(prisma.group.delete).toHaveBeenCalledWith({ where: { id: 'group-1' } })
    })

    it('should throw NotFoundException when group not found', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(null)

      await expect(service.deleteGroup('nonexistent', 'admin-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateGroup', () => {
    it('should call groupsService.adminUpdate with data', async () => {
      const updateData = { name: 'Updated Name', description: 'Updated description' }
      jest.spyOn(groupsService, 'adminUpdate').mockResolvedValue(mockGroup as any)

      const result = await service.updateGroup('group-1', updateData)
      expect(result).toEqual(mockGroup)
      expect(groupsService.adminUpdate).toHaveBeenCalledWith('group-1', updateData)
    })

    it('should update only provided fields', async () => {
      jest.spyOn(groupsService, 'adminUpdate').mockResolvedValue(mockGroup as any)

      await service.updateGroup('group-1', { name: 'Only Name' })
      expect(groupsService.adminUpdate).toHaveBeenCalledWith('group-1', { name: 'Only Name' })
    })
  })

  describe('deleteUser', () => {
    it('should delete user by id with transaction', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue([])
      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        const tx = {
          groupMember: { deleteMany: jest.fn() },
          performanceRecord: { deleteMany: jest.fn() },
          disputeVote: { deleteMany: jest.fn() },
          invitation: { deleteMany: jest.fn() },
          dispute: { deleteMany: jest.fn() },
          exercise: { deleteMany: jest.fn() },
          group: { deleteMany: jest.fn() },
          user: { delete: jest.fn().mockResolvedValue(mockUser) },
        }
        return cb(tx)
      })

      const result = await service.deleteUser('user-1', 'admin-1')
      expect(result).toBe(true)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    })

    it('should throw ConflictException when deleting self', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

      await expect(service.deleteUser('user-1', 'user-1')).rejects.toThrow('No puedes eliminarte a ti mismo')
    })

    it('should throw ConflictException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      await expect(service.deleteUser('nonexistent', 'admin-1')).rejects.toThrow(ConflictException)
    })
  })

  describe('deleteExercise', () => {
    it('should call exercisesService.adminDelete', async () => {
      jest.spyOn(exercisesService, 'adminDelete').mockResolvedValue(true)

      const result = await service.deleteExercise('exercise-1')
      expect(result).toBe(true)
      expect(exercisesService.adminDelete).toHaveBeenCalledWith('exercise-1')
    })
  })

  describe('listGroups', () => {
    it('should return paginated groups from groupsService.adminFindAll', async () => {
      const paginatedResult = {
        items: [mockGroup],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1,
      }
      jest.spyOn(groupsService, 'adminFindAll').mockResolvedValue(paginatedResult as any)

      const result = await service.listGroups(1, 20)
      expect(result.items).toHaveLength(1)
      expect(result.totalCount).toBe(1)
      expect(result.currentPage).toBe(1)
      expect(groupsService.adminFindAll).toHaveBeenCalledWith(1, 20)
    })

    it('should pass pagination parameters correctly', async () => {
      jest.spyOn(groupsService, 'adminFindAll').mockResolvedValue({ items: [], totalCount: 0, currentPage: 2, totalPages: 0 } as any)

      await service.listGroups(2, 10)
      expect(groupsService.adminFindAll).toHaveBeenCalledWith(2, 10)
    })
  })

  describe('listUsers', () => {
    const mockUsers = [
      { ...mockUser, id: 'user-1', name: 'User 1' },
      { ...mockUser, id: 'user-2', name: 'User 2' },
    ]

    it('should return paginated users from usersService.findAll', async () => {
      jest.spyOn(usersService, 'findAll').mockResolvedValue({
        items: mockUsers,
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
      })

      const result = await service.listUsers(1, 20)
      expect(result.items).toHaveLength(2)
      expect(usersService.findAll).toHaveBeenCalledWith(1, 20)
    })

    it('should use default pagination when not specified', async () => {
      jest.spyOn(usersService, 'findAll').mockResolvedValue({ items: [], totalCount: 0, currentPage: 1, totalPages: 0 })

      await service.listUsers()
      expect(usersService.findAll).toHaveBeenCalledWith(1, 20)
    })
  })

  describe('listExercises', () => {
    it('should return paginated exercises from exercisesService.adminFindAll', async () => {
      jest.spyOn(exercisesService, 'adminFindAll').mockResolvedValue({ items: [], totalCount: 0, currentPage: 1, totalPages: 0 } as any)

      const result = await service.listExercises(1, 20)
      expect(result).toBeDefined()
      expect(exercisesService.adminFindAll).toHaveBeenCalledWith(1, 20)
    })
  })
})
