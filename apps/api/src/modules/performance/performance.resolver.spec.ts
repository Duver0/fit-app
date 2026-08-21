import { Test, TestingModule } from '@nestjs/testing'
import { PerformanceResolver } from './performance.resolver'
import { PerformanceService } from './performance.service'

describe('PerformanceResolver', () => {
  let resolver: PerformanceResolver
  let service: PerformanceService

  const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'USER' as any }

  const mockRecord = {
    id: 'record-1',
    exerciseId: 'exercise-1',
    userId: 'user-1',
    groupId: 'group-1',
    value: 100,
    reps: null,
    weight: null,
    recordedAt: new Date(),
    updatedAt: new Date(),
  }

  const mockPerformanceService = {
    upsert: jest.fn(),
    findByUserAndExercise: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceResolver,
        {
          provide: PerformanceService,
          useValue: mockPerformanceService,
        },
      ],
    }).compile()

    resolver = module.get<PerformanceResolver>(PerformanceResolver)
    service = module.get<PerformanceService>(PerformanceService)
    jest.clearAllMocks()
  })

  describe('upsertPerformance', () => {
    it('should call performanceService.upsert with userId from context and input', async () => {
      mockPerformanceService.upsert.mockResolvedValue(mockRecord)

      const input = { exerciseId: 'exercise-1', value: 100 }
      const result = await resolver.upsertPerformance(mockUser as any, input)

      expect(service.upsert).toHaveBeenCalledWith('user-1', input)
      expect(result).toEqual(mockRecord)
    })

    it('should pass reps and weight for REPS_AND_WEIGHT exercises', async () => {
      const recordWithReps = { ...mockRecord, reps: 10, weight: 20, value: 200 }
      mockPerformanceService.upsert.mockResolvedValue(recordWithReps)

      const input = { exerciseId: 'exercise-1', reps: 10, weight: 20 }
      const result = await resolver.upsertPerformance(mockUser as any, input)

      expect(service.upsert).toHaveBeenCalledWith('user-1', input)
      expect(result.value).toBe(200)
    })
  })

  describe('myPerformance', () => {
    it('should call performanceService.findByUserAndExercise with userId and exerciseId', async () => {
      mockPerformanceService.findByUserAndExercise.mockResolvedValue(mockRecord)

      const result = await resolver.myPerformance(mockUser as any, 'exercise-1')

      expect(service.findByUserAndExercise).toHaveBeenCalledWith('user-1', 'exercise-1')
      expect(result).toEqual(mockRecord)
    })

    it('should return null when no performance record exists', async () => {
      mockPerformanceService.findByUserAndExercise.mockResolvedValue(null)

      const result = await resolver.myPerformance(mockUser as any, 'exercise-nonexistent')

      expect(service.findByUserAndExercise).toHaveBeenCalledWith('user-1', 'exercise-nonexistent')
      expect(result).toBeNull()
    })
  })
})
