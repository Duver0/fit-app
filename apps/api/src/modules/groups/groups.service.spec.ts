import { Test, TestingModule } from '@nestjs/testing'
import { GroupsService } from './groups.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ForbiddenException, NotFoundException } from '@nestjs/common'

describe('GroupsService', () => {
  let service: GroupsService
  let prisma: PrismaService

  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    avatarUrl: null,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { members: 3 },
    owner: { id: 'user-1', name: 'Owner' },
    members: [
      { id: 'gm-1', userId: 'user-1', groupId: 'group-1', role: 'OWNER', joinedAt: new Date(), user: { id: 'user-1', name: 'Owner' } },
      { id: 'gm-2', userId: 'user-2', groupId: 'group-1', role: 'MEMBER', joinedAt: new Date(), user: { id: 'user-2', name: 'Member' } },
    ],
    exercises: [],
  }

  const mockMembership = { id: 'gm-1', userId: 'user-1', groupId: 'group-1', role: 'OWNER', joinedAt: new Date() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: PrismaService,
          useValue: {
            group: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            groupMember: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<GroupsService>(GroupsService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('findById', () => {
    it('should return group with members', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(mockGroup as any)
      const result = await service.findById('group-1')
      expect(result.name).toBe('Test Group')
      expect(result.memberCount).toBe(3)
    })

    it('should throw NotFoundException when group not found', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(null)
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('should create group with owner membership', async () => {
      const createData = { name: 'New Group', description: 'Description' }
      jest.spyOn(prisma.group, 'create').mockResolvedValue({ ...mockGroup, name: 'New Group', _count: { members: 1 } } as any)

      const result = await service.create('user-1', createData)
      expect(result.name).toBe('New Group')
      expect(prisma.group.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          ownerId: 'user-1',
          members: { create: { userId: 'user-1', role: 'OWNER' } },
        },
        include: { _count: { select: { members: true } } },
      })
    })
  })

  describe('update', () => {
    it('should allow owner to update group', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(mockGroup as any)
      jest.spyOn(prisma.group, 'update').mockResolvedValue({ ...mockGroup, name: 'Updated' } as any)

      const result = await service.update('group-1', 'user-1', { name: 'Updated' })
      expect(result.name).toBe('Updated')
    })

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(mockGroup as any)
      await expect(service.update('group-1', 'user-2', { name: 'Updated' })).rejects.toThrow(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('should allow owner to delete group', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(mockGroup as any)
      jest.spyOn(prisma.group, 'delete').mockResolvedValue(mockGroup as any)

      const result = await service.delete('group-1', 'user-1')
      expect(result).toBe(true)
    })

    it('should throw ForbiddenException when non-owner tries to delete', async () => {
      jest.spyOn(prisma.group, 'findUnique').mockResolvedValue(mockGroup as any)
      await expect(service.delete('group-1', 'user-2')).rejects.toThrow(ForbiddenException)
    })
  })
})
