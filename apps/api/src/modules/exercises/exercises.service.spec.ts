import { Test, TestingModule } from '@nestjs/testing'
import { ExercisesService } from './exercises.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ExerciseUnit } from '@prisma/client'

describe('ExercisesService', () => {
  let service: ExercisesService
  let prisma: PrismaService

  const mockExercise = {
    id: 'exercise-1',
    groupId: 'group-1',
    name: 'Bench Press',
    unit: ExerciseUnit.KG,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerMembership = {
    id: 'gm-1',
    groupId: 'group-1',
    userId: 'user-1',
    role: 'OWNER',
    joinedAt: new Date(),
  }

  const mockMemberMembership = {
    id: 'gm-2',
    groupId: 'group-1',
    userId: 'user-2',
    role: 'MEMBER',
    joinedAt: new Date(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        {
          provide: PrismaService,
          useValue: {
            exercise: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            groupMember: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<ExercisesService>(ExercisesService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('create', () => {
    it('should create exercise when user is group owner', async () => {
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockOwnerMembership as any)
      jest.spyOn(prisma.exercise, 'create').mockResolvedValue(mockExercise)

      const result = await service.create('user-1', {
        groupId: 'group-1',
        name: 'Bench Press',
      })
      expect(result).toEqual(mockExercise)
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', userId: 'user-1' },
      })
      expect(prisma.exercise.create).toHaveBeenCalledWith({
        data: {
          groupId: 'group-1',
          name: 'Bench Press',
          createdBy: 'user-1',
          unit: ExerciseUnit.KG,
        },
      })
    })

    it('should create exercise when user is a regular member', async () => {
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMemberMembership as any)
      jest.spyOn(prisma.exercise, 'create').mockResolvedValue(mockExercise)

      const result = await service.create('user-2', {
        groupId: 'group-1',
        name: 'Push Ups',
      })
      expect(result).toEqual(mockExercise)
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', userId: 'user-2' },
      })
    })

    it('should create exercise with custom unit', async () => {
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockOwnerMembership as any)
      jest.spyOn(prisma.exercise, 'create').mockResolvedValue({ ...mockExercise, unit: ExerciseUnit.REPS })

      const result = await service.create('user-1', {
        groupId: 'group-1',
        name: 'Push Ups',
        unit: 'REPS',
      })
      expect(result.unit).toBe(ExerciseUnit.REPS)
      expect(prisma.exercise.create).toHaveBeenCalledWith({
        data: {
          groupId: 'group-1',
          name: 'Push Ups',
          createdBy: 'user-1',
          unit: ExerciseUnit.REPS,
        },
      })
    })

    it('should throw ForbiddenException when user is not a member', async () => {
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)

      await expect(
        service.create('user-3', { groupId: 'group-1', name: 'Bench Press' }),
      ).rejects.toThrow(ForbiddenException)
      await expect(
        service.create('user-3', { groupId: 'group-1', name: 'Bench Press' }),
      ).rejects.toThrow('You must be a group member to create exercises')
    })
  })

  describe('findByGroup', () => {
    it('should return exercises for a group', async () => {
      const exercises = [mockExercise, { ...mockExercise, id: 'exercise-2', name: 'Squat' }]
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue(exercises as any)

      const result = await service.findByGroup('group-1')
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Bench Press')
      expect(result[1].name).toBe('Squat')
      expect(prisma.exercise.findMany).toHaveBeenCalledWith({
        where: { groupId: 'group-1' },
      })
    })

    it('should return empty array when group has no exercises', async () => {
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue([])

      const result = await service.findByGroup('empty-group')
      expect(result).toEqual([])
    })
  })

  describe('findById', () => {
    it('should return exercise when found', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)

      const result = await service.findById('exercise-1')
      expect(result).toEqual(mockExercise)
    })

    it('should throw NotFoundException when exercise not found', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(null)

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('delete', () => {
    it('should delete exercise when user is group owner', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockOwnerMembership as any)
      jest.spyOn(prisma.exercise, 'delete').mockResolvedValue(mockExercise)

      const result = await service.delete('exercise-1', 'user-1')
      expect(result).toBe(true)
      expect(prisma.exercise.delete).toHaveBeenCalledWith({ where: { id: 'exercise-1' } })
    })

    it('should throw NotFoundException when exercise does not exist', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(null)

      await expect(service.delete('nonexistent', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when user is not the owner', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)

      await expect(service.delete('exercise-1', 'user-2')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('adminDelete', () => {
    it('should delete any exercise as super admin', async () => {
      jest.spyOn(prisma.exercise, 'delete').mockResolvedValue(mockExercise)

      const result = await service.adminDelete('exercise-1')
      expect(result).toBe(true)
      expect(prisma.exercise.delete).toHaveBeenCalledWith({ where: { id: 'exercise-1' } })
    })

    it('should throw when exercise does not exist', async () => {
      jest.spyOn(prisma.exercise, 'delete').mockRejectedValue(new Error('Record to delete does not exist.'))

      await expect(service.adminDelete('nonexistent')).rejects.toThrow()
    })
  })

  describe('adminFindAll', () => {
    const mockExercises = [
      { ...mockExercise, group: { id: 'group-1', name: 'Test Group' } },
      { ...mockExercise, id: 'exercise-2', name: 'Squat', group: { id: 'group-1', name: 'Test Group' } },
    ]

    it('should return paginated exercises with group info', async () => {
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue(mockExercises as any)
      jest.spyOn(prisma.exercise, 'count').mockResolvedValue(2)

      const result = await service.adminFindAll(1, 20)
      expect(result.items).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.currentPage).toBe(1)
      expect(result.totalPages).toBe(1)
      expect(prisma.exercise.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        include: { group: true },
      })
    })

    it('should paginate with custom page and limit', async () => {
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue([mockExercises[0]] as any)
      jest.spyOn(prisma.exercise, 'count').mockResolvedValue(10)

      const result = await service.adminFindAll(2, 5)
      expect(result.items).toHaveLength(1)
      expect(result.currentPage).toBe(2)
      expect(result.totalPages).toBe(2)
      expect(prisma.exercise.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        include: { group: true },
      })
    })
  })
})
