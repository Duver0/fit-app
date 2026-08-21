import { Test, TestingModule } from '@nestjs/testing'
import { RankingResolver } from './ranking.resolver'
import { RankingService } from './ranking.service'

describe('RankingResolver', () => {
  let resolver: RankingResolver
  let service: RankingService

  const mockRankingService = {
    getRanking: jest.fn(),
    getTop3: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingResolver,
        {
          provide: RankingService,
          useValue: mockRankingService,
        },
      ],
    }).compile()

    resolver = module.get<RankingResolver>(RankingResolver)
    service = module.get<RankingService>(RankingService)
    jest.clearAllMocks()
  })

  describe('ranking', () => {
    it('should call rankingService.getRanking with correct args', async () => {
      const mockResult = {
        items: [
          { rank: 1, value: 100, userId: 'user-1', exerciseId: 'exercise-1' },
        ],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1,
      }
      mockRankingService.getRanking.mockResolvedValue(mockResult)

      const result = await resolver.ranking('exercise-1', 1, 20)

      expect(service.getRanking).toHaveBeenCalledWith('exercise-1', 1, 20)
      expect(result).toEqual(mockResult)
    })

    it('should use default page=1 and limit=20 when not provided', async () => {
      mockRankingService.getRanking.mockResolvedValue({ items: [], totalCount: 0, currentPage: 1, totalPages: 0 })

      await resolver.ranking('exercise-1')

      expect(service.getRanking).toHaveBeenCalledWith('exercise-1', 1, 20)
    })

    it('should pass custom page and limit', async () => {
      mockRankingService.getRanking.mockResolvedValue({ items: [], totalCount: 0, currentPage: 3, totalPages: 5 })

      await resolver.ranking('exercise-1', 3, 5)

      expect(service.getRanking).toHaveBeenCalledWith('exercise-1', 3, 5)
    })
  })

  describe('top3Ranking', () => {
    it('should call rankingService.getTop3 with correct groupId', async () => {
      const mockResult = [
        {
          exercise: { id: 'exercise-1', name: 'Bench Press' },
          top: [
            { rank: 1, value: 100, userId: 'user-1' },
            { rank: 2, value: 90, userId: 'user-2' },
            { rank: 3, value: 80, userId: 'user-3' },
          ],
        },
      ]
      mockRankingService.getTop3.mockResolvedValue(mockResult)

      const result = await resolver.top3Ranking('group-1')

      expect(service.getTop3).toHaveBeenCalledWith('group-1')
      expect(result).toEqual(mockResult)
    })

    it('should return empty array when group has no data', async () => {
      mockRankingService.getTop3.mockResolvedValue([])

      const result = await resolver.top3Ranking('group-empty')

      expect(service.getTop3).toHaveBeenCalledWith('group-empty')
      expect(result).toEqual([])
    })
  })
})
