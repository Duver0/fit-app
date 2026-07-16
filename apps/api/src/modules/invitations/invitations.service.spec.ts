import { Test, TestingModule } from '@nestjs/testing'
import { InvitationsService } from './invitations.service'
import { PrismaService } from '../../prisma/prisma.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { UserRole } from '@prisma/client'

describe('InvitationsService', () => {
  let service: InvitationsService
  let prisma: PrismaService

  const mockInvitation = {
    id: 'invite-1',
    groupId: 'group-1',
    inviteeEmail: 'invitee@test.com',
    inviterId: 'user-1',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    group: { id: 'group-1', name: 'Test Group' },
    inviter: { id: 'user-1', name: 'Inviter' },
  }

  const mockMember = {
    id: 'gm-1',
    userId: 'user-2',
    groupId: 'group-1',
    role: 'MEMBER',
    joinedAt: new Date(),
    user: { id: 'user-2', email: 'existing@test.com' },
  }

  const mockUser = {
    id: 'user-3',
    auth0Id: 'local|invitee@test.com',
    email: 'invitee@test.com',
    name: 'Invitee',
    phone: null,
    avatarUrl: null,
    passwordHash: null,
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: PrismaService,
          useValue: {
            groupMember: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            invitation: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<InvitationsService>(InvitationsService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('invite', () => {
    it('should create invitation with PENDING status', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.invitation, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.invitation, 'create').mockResolvedValue(mockInvitation as any)

      const result = await service.invite('group-1', 'invitee@test.com', 'user-1')
      expect(result.status).toBe('PENDING')
      expect(prisma.invitation.create).toHaveBeenCalledWith({
        data: { groupId: 'group-1', inviteeEmail: 'invitee@test.com', inviterId: 'user-1' },
        include: { group: true, inviter: true },
      })
    })

    it('should throw BadRequestException when user is already a member', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMember as any)

      await expect(
        service.invite('group-1', 'existing@test.com', 'user-1'),
      ).rejects.toThrow(BadRequestException)
      await expect(
        service.invite('group-1', 'existing@test.com', 'user-1'),
      ).rejects.toThrow('User is already a member')
    })

    it('should throw BadRequestException when pending invitation exists', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.invitation, 'findFirst').mockResolvedValue(mockInvitation as any)

      await expect(
        service.invite('group-1', 'invitee@test.com', 'user-1'),
      ).rejects.toThrow(BadRequestException)
      await expect(
        service.invite('group-1', 'invitee@test.com', 'user-1'),
      ).rejects.toThrow('Invitation already sent')
    })

    it('should throw NotFoundException when invitee email has no account', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      await expect(
        service.invite('group-1', 'unknown@test.com', 'user-1'),
      ).rejects.toThrow(NotFoundException)
      await expect(
        service.invite('group-1', 'unknown@test.com', 'user-1'),
      ).rejects.toThrow('No existe una cuenta con ese correo electrónico')
    })

    it('should search for existing membership by email', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.invitation, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.invitation, 'create').mockResolvedValue(mockInvitation as any)

      await service.invite('group-1', 'invitee@test.com', 'user-1')
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', user: { email: 'invitee@test.com' } },
      })
    })

    it('should search for existing pending invitation', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.invitation, 'findFirst').mockResolvedValue(null)
      jest.spyOn(prisma.invitation, 'create').mockResolvedValue(mockInvitation as any)

      await service.invite('group-1', 'invitee@test.com', 'user-1')
      expect(prisma.invitation.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', inviteeEmail: 'invitee@test.com', status: 'PENDING' },
      })
    })
  })

  describe('accept', () => {
    it('should create GroupMember and update status to ACCEPTED', async () => {
      jest.spyOn(prisma.invitation, 'findUnique').mockResolvedValue(mockInvitation as any)
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma, '$transaction').mockResolvedValue([])

      const result = await service.accept('invite-1', 'user-3')
      expect(result).toBe(true)
      expect(prisma.$transaction).toHaveBeenCalledWith([
        prisma.invitation.update({ where: { id: 'invite-1' }, data: { status: 'ACCEPTED' } }),
        prisma.groupMember.create({
          data: { groupId: 'group-1', userId: 'user-3', role: 'MEMBER' },
        }),
      ])
    })

    it('should throw NotFoundException when invitation does not exist', async () => {
      jest.spyOn(prisma.invitation, 'findUnique').mockResolvedValue(null)

      await expect(service.accept('nonexistent', 'user-3')).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when invitation is not PENDING', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 'ACCEPTED' }
      jest.spyOn(prisma.invitation, 'findUnique').mockResolvedValue(acceptedInvitation as any)

      await expect(service.accept('invite-1', 'user-3')).rejects.toThrow(BadRequestException)
      await expect(service.accept('invite-1', 'user-3')).rejects.toThrow('Invitation is not pending')
    })

    it('should throw BadRequestException when email does not match', async () => {
      const differentUser = { ...mockUser, email: 'different@test.com' }
      jest.spyOn(prisma.invitation, 'findUnique').mockResolvedValue(mockInvitation as any)
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(differentUser)

      await expect(service.accept('invite-1', 'user-3')).rejects.toThrow(BadRequestException)
      await expect(service.accept('invite-1', 'user-3')).rejects.toThrow('Email does not match')
    })
  })

  describe('decline', () => {
    it('should update invitation status to DECLINED', async () => {
      const declinedInvitation = { ...mockInvitation, status: 'DECLINED' }
      jest.spyOn(prisma.invitation, 'update').mockResolvedValue(declinedInvitation as any)

      const result = await service.decline('invite-1')
      expect(result).toBe(true)
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: { status: 'DECLINED' },
      })
    })
  })

  describe('findByUser', () => {
    it('should find pending invitations by user email', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      const pendingInvitations = [mockInvitation]
      jest.spyOn(prisma.invitation, 'findMany').mockResolvedValue(pendingInvitations as any)

      const result = await service.findByUser('user-3')
      expect(result).toHaveLength(1)
      expect(prisma.invitation.findMany).toHaveBeenCalledWith({
        where: { inviteeEmail: 'invitee@test.com', status: 'PENDING' },
        include: { group: true, inviter: true },
      })
    })

    it('should throw NotFoundException when user does not exist', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      await expect(service.findByUser('nonexistent')).rejects.toThrow(NotFoundException)
    })

    it('should return empty array when no pending invitations', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
      jest.spyOn(prisma.invitation, 'findMany').mockResolvedValue([])

      const result = await service.findByUser('user-3')
      expect(result).toEqual([])
    })
  })
})
