import { Test, TestingModule } from '@nestjs/testing'
import { DisputesResolver } from './disputes.resolver'
import { DisputesService } from './disputes.service'

describe('DisputesResolver', () => {
  let resolver: DisputesResolver
  let service: DisputesService

  const mockUser = { id: 'user-2', email: 'test@test.com', name: 'Test', role: 'USER' as any }

  const mockDispute = {
    id: 'dispute-1',
    status: 'OPEN',
    reason: 'Suspicious value',
    performanceId: 'record-1',
    groupId: 'group-1',
    initiatedById: 'user-2',
    votes: [],
  }

  const mockDisputesService = {
    create: jest.fn(),
    vote: jest.fn(),
    cancel: jest.fn(),
    findByPerformance: jest.fn(),
    findByUser: jest.fn(),
    findByGroup: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesResolver,
        {
          provide: DisputesService,
          useValue: mockDisputesService,
        },
      ],
    }).compile()

    resolver = module.get<DisputesResolver>(DisputesResolver)
    service = module.get<DisputesService>(DisputesService)
    jest.clearAllMocks()
  })

  describe('createDispute', () => {
    it('should call disputesService.create with userId from context and input', async () => {
      mockDisputesService.create.mockResolvedValue(mockDispute)

      const input = { performanceId: 'record-1', reason: 'Suspicious value' }
      const result = await resolver.createDispute(mockUser as any, input)

      expect(service.create).toHaveBeenCalledWith('user-2', input)
      expect(result).toEqual(mockDispute)
    })

    it('should pass the correct input to the service', async () => {
      mockDisputesService.create.mockResolvedValue(mockDispute)

      const input = { performanceId: 'record-99', reason: 'This looks wrong' }
      await resolver.createDispute(mockUser as any, input)

      expect(service.create).toHaveBeenCalledWith('user-2', {
        performanceId: 'record-99',
        reason: 'This looks wrong',
      })
    })
  })

  describe('voteDispute', () => {
    it('should call disputesService.vote with userId, disputeId, and vote option', async () => {
      const updatedDispute = { ...mockDispute, votes: [{ id: 'v1', userId: 'user-2', vote: 'REAL' }] }
      mockDisputesService.vote.mockResolvedValue(updatedDispute)

      const input = { disputeId: 'dispute-1', vote: 'REAL' as any }
      const result = await resolver.voteDispute(mockUser as any, input)

      expect(service.vote).toHaveBeenCalledWith('user-2', 'dispute-1', 'REAL')
      expect(result).toEqual(updatedDispute)
    })

    it('should pass FAKE vote option correctly', async () => {
      mockDisputesService.vote.mockResolvedValue(mockDispute)

      const input = { disputeId: 'dispute-1', vote: 'FAKE' as any }
      await resolver.voteDispute(mockUser as any, input)

      expect(service.vote).toHaveBeenCalledWith('user-2', 'dispute-1', 'FAKE')
    })
  })

  describe('cancelDispute', () => {
    it('should call disputesService.cancel with userId and disputeId', async () => {
      const cancelledDispute = { ...mockDispute, status: 'CANCELLED' }
      mockDisputesService.cancel.mockResolvedValue(cancelledDispute)

      const result = await resolver.cancelDispute(mockUser as any, 'dispute-1')

      expect(service.cancel).toHaveBeenCalledWith('user-2', 'dispute-1')
      expect(result).toEqual(cancelledDispute)
    })
  })

  describe('disputes (query)', () => {
    it('should call disputesService.findByPerformance with performanceId', async () => {
      mockDisputesService.findByPerformance.mockResolvedValue([mockDispute])

      const result = await resolver.disputes('record-1')

      expect(service.findByPerformance).toHaveBeenCalledWith('record-1')
      expect(result).toEqual([mockDispute])
    })
  })

  describe('myDisputes', () => {
    it('should call disputesService.findByUser with userId from context', async () => {
      mockDisputesService.findByUser.mockResolvedValue([mockDispute])

      const result = await resolver.myDisputes(mockUser as any)

      expect(service.findByUser).toHaveBeenCalledWith('user-2')
      expect(result).toEqual([mockDispute])
    })
  })

  describe('groupDisputes', () => {
    it('should call disputesService.findByGroup with groupId', async () => {
      mockDisputesService.findByGroup.mockResolvedValue([mockDispute])

      const result = await resolver.groupDisputes('group-1')

      expect(service.findByGroup).toHaveBeenCalledWith('group-1')
      expect(result).toEqual([mockDispute])
    })
  })
})
