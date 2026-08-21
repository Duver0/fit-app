import { Test, TestingModule } from '@nestjs/testing'
import { PerformanceService } from './performance.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ExerciseUnit, GroupMemberRole } from '@prisma/client'

describe('PerformanceService', () => {
  let service: PerformanceService
  let prisma: PrismaService

  const mockExercise = {
    id: 'exercise-1',
    groupId: 'group-1',
    name: 'Bench Press',
    unit: ExerciseUnit.KG,
    imageUrl: null,
    createdBy: 'user-1',
    wgerId: null,
    wgerCategory: null,
    wgerMuscles: null,
    wgerEquipment: null,
    wgerInstructions: null,
    categoryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockMembership = { id: 'gm-1', userId: 'user-2', groupId: 'group-1', role: GroupMemberRole.MEMBER, joinedAt: new Date(), isActive: true }
  const mockRecord = {
    id: 'record-1',
    exerciseId: 'exercise-1',
    userId: 'user-2',
    groupId: 'group-1',
    value: 100,
    reps: null,
    weight: null,
    recordedAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedByDisputeId: null,
    disputeResult: null,
    disputedAt: null,
  }

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    delPattern: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG'),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: PrismaService,
          useValue: {
            exercise: {
              findUnique: jest.fn(),
            },
            groupMember: {
              findFirst: jest.fn(),
            },
            performanceRecord: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile()

    service = module.get<PerformanceService>(PerformanceService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('upsert', () => {
    it('should create new record when none exists', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.performanceRecord, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.performanceRecord, 'create').mockResolvedValue(mockRecord)

      const result = await service.upsert('user-2', { exerciseId: 'exercise-1', value: 100 })
      expect(result).toEqual(mockRecord)
    })

    it('should update existing record', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.performanceRecord, 'findUnique').mockResolvedValue(mockRecord)
      jest.spyOn(prisma.performanceRecord, 'update').mockResolvedValue({ ...mockRecord, value: 120 })

      const result = await service.upsert('user-2', { exerciseId: 'exercise-1', value: 120 })
      expect(result.value).toBe(120)
    })

    it('should throw NotFoundException when exercise not found', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(null)
      await expect(service.upsert('user-2', { exerciseId: 'nonexistent', value: 100 })).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when user is not a member', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)
      await expect(service.upsert('user-3', { exerciseId: 'exercise-1', value: 100 })).rejects.toThrow(ForbiddenException)
    })
  })
})
