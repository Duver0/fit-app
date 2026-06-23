import { Test, TestingModule } from '@nestjs/testing'
import { DisputesService } from './disputes.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BadRequestException } from '@nestjs/common'
import { GroupMemberRole } from '@prisma/client'

describe('DisputesService', () => {
  let service: DisputesService
  let prisma: PrismaService

  const mockRecord = {
    id: 'record-1',
    exerciseId: 'exercise-1',
    userId: 'user-1',
    groupId: 'group-1',
    value: 100,
    recordedAt: new Date(),
    updatedAt: new Date(),
    exercise: { id: 'exercise-1', name: 'Bench Press', groupId: 'group-1', unit: 'KG' },
  }

  const mockMembership = { id: 'gm-1', userId: 'user-2', groupId: 'group-1', role: GroupMemberRole.MEMBER, joinedAt: new Date() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        {
          provide: PrismaService,
          useValue: {
            performanceRecord: {
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
            groupMember: {
              findFirst: jest.fn(),
              count: jest.fn(),
            },
            dispute: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            disputeVote: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<DisputesService>(DisputesService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('create', () => {
    it('should create dispute for another user record', async () => {
      jest.spyOn(prisma.performanceRecord, 'findUnique').mockResolvedValue(mockRecord as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.dispute, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.dispute, 'create').mockResolvedValue({ id: 'dispute-1', status: 'OPEN' } as any)

      const result = await service.create('user-2', { performanceId: 'record-1', reason: 'Suspicious' })
      expect(result.status).toBe('OPEN')
    })

    it('should throw BadRequestException when disputing own record', async () => {
      jest.spyOn(prisma.performanceRecord, 'findUnique').mockResolvedValue(mockRecord as any)
      await expect(service.create('user-1', { performanceId: 'record-1', reason: 'Suspicious' })).rejects.toThrow(BadRequestException)
    })
  })

  describe('vote', () => {
    const openDispute = {
      id: 'dispute-1',
      performanceId: 'record-1',
      status: 'OPEN',
      performance: mockRecord,
      votes: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }

    it('should record vote', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(openDispute as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'vote-1', vote: true } as any)
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(3)
      jest.spyOn(prisma.dispute, 'update').mockResolvedValue(openDispute as any)

      const result = await service.vote('user-2', 'dispute-1', true)
      expect(prisma.disputeVote.create).toHaveBeenCalled()
    })

    it('should resolve dispute when 51% threshold is met', async () => {
      const disputeWithVotes = {
        ...openDispute,
        votes: [
          { id: 'v1', userId: 'user-2', vote: true },
          { id: 'v2', userId: 'user-3', vote: true },
        ],
      }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(disputeWithVotes as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'v3', vote: true } as any)
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(3)
      ;(prisma.$transaction as any).mockResolvedValue([])

      const result = await service.vote('user-4', 'dispute-1', true)
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })
})
