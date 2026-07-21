import { Test, TestingModule } from '@nestjs/testing'
import { RankingService } from './ranking.service'
import { PrismaService } from '../../prisma/prisma.service'
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

  beforeEach(async () => {
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
          },
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
        where: { exerciseId: 'exercise-1' },
        orderBy: { value: 'desc' },
        skip: 10,
        take: 10,
        include: { user: true },
      })
    })
  })

  describe('getTop3', () => {
    it('should return top 3 records per exercise', async () => {
      const exercises = [
        { ...mockExercise, id: 'exercise-1', name: 'Bench Press' },
        { ...mockExercise, id: 'exercise-2', name: 'Squat' },
      ]
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue(exercises as any)

      const benchRecords = [
        makeRecord('r1', 'user-1', 100),
        makeRecord('r2', 'user-2', 95),
        makeRecord('r3', 'user-3', 90),
      ]
      const squatRecords = [
        makeRecord('r4', 'user-1', 200),
        makeRecord('r5', 'user-2', 180),
        makeRecord('r6', 'user-3', 160),
      ]

      jest
        .spyOn(prisma.performanceRecord, 'findMany')
        .mockResolvedValueOnce(benchRecords as any)
        .mockResolvedValueOnce(squatRecords as any)

      const result = await service.getTop3('group-1')
      expect(result).toHaveLength(2)

      expect(result[0].exercise.name).toBe('Bench Press')
      expect(result[0].top).toHaveLength(3)
      expect(result[0].top[0].rank).toBe(1)
      expect(result[0].top[0].value).toBe(100)
      expect(result[0].top[1].rank).toBe(2)
      expect(result[0].top[2].rank).toBe(3)

      expect(result[1].exercise.name).toBe('Squat')
      expect(result[1].top).toHaveLength(3)
      expect(result[1].top[0].rank).toBe(1)
      expect(result[1].top[0].value).toBe(200)
    })

    it('should return only top 3 even when there are more records', async () => {
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue([mockExercise] as any)

      const fiveRecords = Array.from({ length: 5 }, (_, i) =>
        makeRecord(`r${i + 1}`, `user-${(i % 3) + 1}`, 100 - i * 5),
      )
      jest.spyOn(prisma.performanceRecord, 'findMany').mockResolvedValue(fiveRecords.slice(0, 3) as any)

      const result = await service.getTop3('group-1')
      expect(result[0].top).toHaveLength(3)

      // findMany called with take: 3
      expect(prisma.performanceRecord.findMany).toHaveBeenCalledWith({
        where: { exerciseId: 'exercise-1' },
        orderBy: { value: 'desc' },
        take: 3,
        include: { user: true },
      })
    })

    it('should return empty top array when exercise has no records', async () => {
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue([mockExercise] as any)
      jest.spyOn(prisma.performanceRecord, 'findMany').mockResolvedValue([])

      const result = await service.getTop3('group-1')
      expect(result[0].top).toEqual([])
    })

    it('should return empty array when group has no exercises', async () => {
      jest.spyOn(prisma.exercise, 'findMany').mockResolvedValue([])

      const result = await service.getTop3('group-1')
      expect(result).toEqual([])
    })
  })
})
