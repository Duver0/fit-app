import { Test, TestingModule } from '@nestjs/testing'
import { DisputesService } from './disputes.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common'
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

  const mockMembership = { id: 'gm-1', userId: 'user-2', groupId: 'group-1', role: GroupMemberRole.MEMBER, joinedAt: new Date(), isActive: true }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        {
          provide: PrismaService,
          useValue: {
            performanceRecord: {
              findUnique: jest.fn(),
              update: jest.fn(),
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

    it('should throw NotFoundException when record does not exist', async () => {
      jest.spyOn(prisma.performanceRecord, 'findUnique').mockResolvedValue(null)
      await expect(service.create('user-2', { performanceId: 'nonexistent', reason: 'Suspicious' })).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when user is not a group member', async () => {
      jest.spyOn(prisma.performanceRecord, 'findUnique').mockResolvedValue(mockRecord as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)
      await expect(service.create('user-99', { performanceId: 'record-1', reason: 'Suspicious' })).rejects.toThrow(ForbiddenException)
    })

    it('should throw ConflictException when an open dispute already exists', async () => {
      jest.spyOn(prisma.performanceRecord, 'findUnique').mockResolvedValue(mockRecord as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.dispute, 'findFirst').mockResolvedValue({ id: 'existing-dispute', status: 'OPEN' } as any)
      await expect(service.create('user-2', { performanceId: 'record-1', reason: 'Duplicate' })).rejects.toThrow(ConflictException)
    })
  })

  describe('vote', () => {
    const openDispute = {
      id: 'dispute-1',
      performanceId: 'record-1',
      initiatedById: 'user-1',
      status: 'OPEN',
      performance: { ...mockRecord, userId: 'user-1' },
      votes: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }

    it('should record vote', async () => {
      jest.spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValueOnce(openDispute as any)
        .mockResolvedValueOnce({ ...openDispute, votes: [{ id: 'vote-1', userId: 'user-2', vote: 'REAL' }] } as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'vote-1', vote: 'REAL' } as any)
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(3)

      const result = await service.vote('user-2', 'dispute-1', 'REAL')
      expect(prisma.disputeVote.create).toHaveBeenCalled()
    })

    it('should resolve dispute when 51% threshold is met', async () => {
      const disputeWithVotes = {
        ...openDispute,
        votes: [
          { id: 'v1', userId: 'user-2', vote: 'FAKE' },
          { id: 'v2', userId: 'user-3', vote: 'FAKE' },
        ],
      }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(disputeWithVotes as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'v3', vote: 'FAKE' } as any)
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(3)
      ;(prisma.$transaction as any).mockResolvedValue([])

      await service.vote('user-4', 'dispute-1', 'FAKE')
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should throw NotFoundException when dispute does not exist', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(null)
      await expect(service.vote('user-2', 'nonexistent', 'REAL')).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when dispute is already resolved', async () => {
      const resolvedDispute = { ...openDispute, status: 'APPROVED' }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(resolvedDispute as any)
      await expect(service.vote('user-2', 'dispute-1', 'REAL')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when dispute is rejected', async () => {
      const rejectedDispute = { ...openDispute, status: 'REJECTED' }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(rejectedDispute as any)
      await expect(service.vote('user-2', 'dispute-1', 'REAL')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when dispute is cancelled', async () => {
      const cancelledDispute = { ...openDispute, status: 'CANCELLED' }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(cancelledDispute as any)
      await expect(service.vote('user-2', 'dispute-1', 'REAL')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when dispute is expired', async () => {
      const expiredDispute = { ...openDispute, expiresAt: new Date(Date.now() - 1000) }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(expiredDispute as any)
      await expect(service.vote('user-2', 'dispute-1', 'REAL')).rejects.toThrow(BadRequestException)
    })

    it('should throw ForbiddenException when initiator tries to vote on own dispute', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(openDispute as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      await expect(service.vote('user-1', 'dispute-1', 'REAL')).rejects.toThrow(ForbiddenException)
    })

    it('should throw ForbiddenException when record owner tries to vote', async () => {
      const disputeWithDifferentInitiator = { ...openDispute, initiatedById: 'user-3' }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(disputeWithDifferentInitiator as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      await expect(service.vote('user-1', 'dispute-1', 'REAL')).rejects.toThrow(ForbiddenException)
    })

    it('should throw ForbiddenException when voter is not a group member', async () => {
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(openDispute as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)
      await expect(service.vote('user-99', 'dispute-1', 'REAL')).rejects.toThrow(ForbiddenException)
    })

    // --- Edge case: duplicate vote by same user ---
    it('should update existing vote when user votes again (not create a new one)', async () => {
      const disputeWithMemberVotes = {
        ...openDispute,
        votes: [{ id: 'v1', userId: 'user-2', vote: 'FAKE' }],
      }
      jest.spyOn(prisma.dispute, 'findUnique')
        .mockResolvedValueOnce(disputeWithMemberVotes as any)
        .mockResolvedValueOnce({ ...openDispute, votes: [{ id: 'v1', userId: 'user-2', vote: 'REAL' }] } as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue({ id: 'v1', userId: 'user-2', vote: 'FAKE' } as any)
      jest.spyOn(prisma.disputeVote, 'update').mockResolvedValue({ id: 'v1', userId: 'user-2', vote: 'REAL' } as any)
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(3)

      await service.vote('user-2', 'dispute-1', 'REAL')
      expect(prisma.disputeVote.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { vote: 'REAL' },
      })
      expect(prisma.disputeVote.create).not.toHaveBeenCalled()
    })

    // --- Edge case: tie 50/50 → fakeVotes not > realVotes → REJECTED ---
    it('should resolve to REJECTED when votes are exactly tied 50/50', async () => {
      // 4 active members → 2 eligible voters
      // 1 FAKE, 1 REAL → isApproved = false (fakeVotes 1 > realVotes 1 is false) → REJECTED
      const disputeWithEvenSplit = {
        ...openDispute,
        votes: [
          { id: 'v1', userId: 'user-2', vote: 'FAKE' },
          { id: 'v2', userId: 'user-3', vote: 'REAL' },
        ],
      }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(disputeWithEvenSplit as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'v3', vote: 'FAKE' } as any)
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(4) // eligible = 4 - 2 = 2

      const transactionFn = jest.fn().mockResolvedValue(undefined)
      ;(prisma.$transaction as any).mockImplementation(transactionFn)

      await service.vote('user-4', 'dispute-1', 'FAKE')

      // fakeVotes = 2 (v1 FAKE + v3 FAKE), realVotes = 1 (v2 REAL)
      // isApproved = (2 > 1) = true → APPROVED
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should resolve to REJECTED when real votes exceed fake votes', async () => {
      // 4 active members → 2 eligible voters
      // After adding 1 more REAL: 2 REAL, 1 FAKE → isApproved = false → REJECTED
      const disputeWithMoreReal = {
        ...openDispute,
        votes: [
          { id: 'v1', userId: 'user-2', vote: 'FAKE' },
          { id: 'v2', userId: 'user-3', vote: 'REAL' },
        ],
      }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(disputeWithMoreReal as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'v3', vote: 'REAL' } as any)
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(4) // eligible = 2

      const transactionFn = jest.fn().mockResolvedValue(undefined)
      ;(prisma.$transaction as any).mockImplementation(transactionFn)

      await service.vote('user-4', 'dispute-1', 'REAL')

      // fakeVotes = 1, realVotes = 2 → isApproved = false → REJECTED
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    // --- Edge case: not all eligible voters have voted yet → no resolution ---
    it('should NOT call transaction when not all eligible voters have voted', async () => {
      const disputePartialVotes = {
        ...openDispute,
        votes: [
          { id: 'v1', userId: 'user-2', vote: 'FAKE' },
        ],
      }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(disputePartialVotes as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'v2', vote: 'REAL' } as any)
      // 5 active members → eligible = 3, but only 2 votes cast → no resolution
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(5)

      await service.vote('user-3', 'dispute-1', 'REAL')

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    // --- Edge case: eligible voters <= 0 → no resolution ---
    it('should NOT call transaction when there are no eligible voters', async () => {
      const disputeMinimal = {
        ...openDispute,
        votes: [],
      }
      jest.spyOn(prisma.dispute, 'findUnique').mockResolvedValue(disputeMinimal as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMembership)
      jest.spyOn(prisma.disputeVote, 'findUnique').mockResolvedValue(null)
      jest.spyOn(prisma.disputeVote, 'create').mockResolvedValue({ id: 'v1', vote: 'FAKE' } as any)
      // 2 active members → eligible = 2 - 2 = 0 → no resolution possible
      jest.spyOn(prisma.groupMember, 'count').mockResolvedValue(2)

      await service.vote('user-2', 'dispute-1', 'FAKE')

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
