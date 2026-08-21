import { Test, TestingModule } from '@nestjs/testing'
import { RankingService } from './ranking.service'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { ExerciseUnit } from '@prisma/client'

describe('RankingService', () => {
  let service: RankingService
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

  const mockUsers = [
    { id: 'user-1', name: 'User One', email: 'user1@test.com', avatarUrl: null },
    { id: 'user-2', name: 'User Two', email: 'user2@test.com', avatarUrl: null },
    { id: 'user-3', name: 'User Three', email: 'user3@test.com', avatarUrl: null },
  ]

  function makeRecord(id: string, userId: string, value: number) {
    return {
      id,
      exerciseId: 'exercise-1',
      userId,
      groupId: 'group-1',
      value,
      reps: null,
      weight: null,
      recordedAt: new Date(),
      updatedAt: new Date(),
      user: mockUsers.find(u => u.id === userId),
    }
  }

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    delPattern: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG'),
  }

  beforeEach(async () => {
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockClear()
    mockRedis.del.mockClear()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        {
          provide: PrismaService,
          useValue: {
            exercise: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            performanceRecord: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile()

    service = module.get<RankingService>(RankingService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('getRanking', () => {
    it('should order records by value DESC', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)

      const records = [
        makeRecord('r1', 'user-1', 100),
        makeRecord('r2', 'user-2', 90),
        makeRecord('r3', 'user-3', 80),
      ]
      jest.spyOn(prisma.performanceRecord, 'findMany').mockResolvedValue(records as any)
      jest.spyOn(prisma.performanceRecord, 'count').mockResolvedValue(3)

      const result = await service.getRanking('exercise-1')
      expect(result.items).toHaveLength(3)
      expect(result.items[0].rank).toBe(1)
      expect(result.items[0].value).toBe(100)
      expect(result.items[1].rank).toBe(2)
      expect(result.items[1].value).toBe(90)
      expect(result.items[2].rank).toBe(3)
      expect(result.items[2].value).toBe(80)
    })

    it('should paginate correctly', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)

      const allRecords = Array.from({ length: 10 }, (_, i) =>
        makeRecord(`r${i + 1}`, `user-${(i % 3) + 1}`, 100 - i),
      )
      // Page 1 with limit 3 should return first 3 items (values 100, 99, 98)
      jest.spyOn(prisma.performanceRecord, 'findMany').mockResolvedValue(allRecords.slice(0, 3) as any)
      jest.spyOn(prisma.performanceRecord, 'count').mockResolvedValue(10)

      const result = await service.getRanking('exercise-1', 1, 3)
      expect(result.items).toHaveLength(3)
      expect(result.totalCount).toBe(10)
      expect(result.currentPage).toBe(1)
      expect(result.totalPages).toBe(4)
      expect(result.items[0].rank).toBe(1) // skip=0, index=0 => rank 1
      expect(result.items[1].rank).toBe(2)
      expect(result.items[2].rank).toBe(3)

      // Page 3 with limit 3 should return items with ranks 7, 8, 9
      jest.spyOn(prisma.performanceRecord, 'findMany').mockResolvedValue(allRecords.slice(6, 9) as any)

      const page3 = await service.getRanking('exercise-1', 3, 3)
      expect(page3.items).toHaveLength(3)
      expect(page3.items[0].rank).toBe(7) // skip=6, index=0 => rank 7
      expect(page3.items[1].rank).toBe(8)
      expect(page3.items[2].rank).toBe(9)
    })

    it('should return empty result when exercise does not exist', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(null)

      const result = await service.getRanking('nonexistent')
      expect(result.items).toEqual([])
      expect(result.totalCount).toBe(0)
      expect(result.totalPages).toBe(0)
    })

    it('should call performanceRecord.findMany with correct ordering and includes', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
      jest.spyOn(prisma.performanceRecord, 'findMany').mockResolvedValue([])
      jest.spyOn(prisma.performanceRecord, 'count').mockResolvedValue(0)

      await service.getRanking('exercise-1', 2, 10)
      expect(prisma.performanceRecord.findMany).toHaveBeenCalledWith({
        where: { exerciseId: 'exercise-1', deletedAt: null },
        orderBy: { value: 'desc' },
        skip: 10,
        take: 10,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      })
    })
  })

  describe('getTop3', () => {
    function makeRawRow(overrides: Record<string, any>) {
      return {
        exercise_id: 'exercise-1',
        exercise_name: 'Bench Press',
        exercise_description: null,
        exercise_unit: 'KG',
        exercise_group_id: 'group-1',
        exercise_creator_id: 'user-1',
        exercise_created_at: new Date(),
        record_id: 'r1',
        record_value: 100,
        record_reps: null,
        record_weight: null,
        record_recorded_at: new Date(),
        record_updated_at: new Date(),
        user_id: 'user-1',
        user_name: 'User One',
        user_email: 'user1@test.com',
        user_avatar_url: null,
        row_num: BigInt(1),
        ...overrides,
      }
    }

    it('should return top 3 records per exercise', async () => {
      const rawRows = [
        makeRawRow({ exercise_id: 'exercise-1', exercise_name: 'Bench Press', record_id: 'r1', record_value: 100, user_id: 'user-1', row_num: BigInt(1) }),
        makeRawRow({ exercise_id: 'exercise-1', exercise_name: 'Bench Press', record_id: 'r2', record_value: 95, user_id: 'user-2', row_num: BigInt(2) }),
        makeRawRow({ exercise_id: 'exercise-1', exercise_name: 'Bench Press', record_id: 'r3', record_value: 90, user_id: 'user-3', row_num: BigInt(3) }),
        makeRawRow({ exercise_id: 'exercise-2', exercise_name: 'Squat', record_id: 'r4', record_value: 200, user_id: 'user-1', row_num: BigInt(1) }),
        makeRawRow({ exercise_id: 'exercise-2', exercise_name: 'Squat', record_id: 'r5', record_value: 180, user_id: 'user-2', row_num: BigInt(2) }),
        makeRawRow({ exercise_id: 'exercise-2', exercise_name: 'Squat', record_id: 'r6', record_value: 160, user_id: 'user-3', row_num: BigInt(3) }),
      ]
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(rawRows as any)

      const result = await service.getTop3('group-1')
      expect(result).toHaveLength(2)

      expect(result[0].exercise.name).toBe('Bench Press')
      expect(result[0].top).toHaveLength(3)
      expect(result[0].top[0].rank).toBe(1)
      expect(result[0].top[0].value).toBe(100)
      expect(result[0].top[1].rank).toBe(2)
      expect(result[0].top[1].value).toBe(95)
      expect(result[0].top[2].rank).toBe(3)
      expect(result[0].top[2].value).toBe(90)

      expect(result[1].exercise.name).toBe('Squat')
      expect(result[1].top).toHaveLength(3)
      expect(result[1].top[0].rank).toBe(1)
      expect(result[1].top[0].value).toBe(200)
      expect(result[1].top[1].rank).toBe(2)
      expect(result[1].top[1].value).toBe(180)
      expect(result[1].top[2].rank).toBe(3)
      expect(result[1].top[2].value).toBe(160)

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    })

    it('should return only top 3 even when there are more records', async () => {
      const rawRows = [
        makeRawRow({ record_id: 'r1', record_value: 100, row_num: BigInt(1) }),
        makeRawRow({ record_id: 'r2', record_value: 95, row_num: BigInt(2) }),
        makeRawRow({ record_id: 'r3', record_value: 90, row_num: BigInt(3) }),
      ]
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue(rawRows as any)

      const result = await service.getTop3('group-1')
      expect(result[0].top).toHaveLength(3)
      expect(result[0].top[0].value).toBe(100)
      expect(result[0].top[1].value).toBe(95)
      expect(result[0].top[2].value).toBe(90)
    })

    it('should return empty top array when exercise has no records', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([])

      const result = await service.getTop3('group-1')
      expect(result).toEqual([])
    })

    it('should return empty array when group has no exercises', async () => {
      jest.spyOn(prisma, '$queryRaw').mockResolvedValue([])

      const result = await service.getTop3('group-1')
      expect(result).toEqual([])
    })
  })
})
