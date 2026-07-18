import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { GroupsService } from '../groups/groups.service'
import { ExercisesService } from '../exercises/exercises.service'
import { UsersService } from '../users/users.service'

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
    private exercisesService: ExercisesService,
    private usersService: UsersService,
  ) {}

  async deleteGroup(id: string) {
    return this.groupsService.adminDelete(id)
  }

  async updateGroup(id: string, data: { name?: string; description?: string }) {
    return this.groupsService.adminUpdate(id, data)
  }

  async deleteUser(id: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new ConflictException('Usuario no encontrado')

    // Delete related records in a transaction to avoid FK violations
    await this.prisma.$transaction([
      // Delete memberships
      this.prisma.groupMember.deleteMany({ where: { userId: id } }),
      // Delete performance records
      this.prisma.performanceRecord.deleteMany({ where: { userId: id } }),
      // Delete dispute votes
      this.prisma.disputeVote.deleteMany({ where: { userId: id } }),
      // Delete invitations sent by this user
      this.prisma.invitation.deleteMany({ where: { inviterId: id } }),
      // Delete disputes initiated by this user
      this.prisma.dispute.deleteMany({ where: { initiatedById: id } }),
      // Delete exercises created by this user
      this.prisma.exercise.deleteMany({ where: { createdBy: id } }),
      // Transfer or delete owned groups
      // For simplicity, delete owned groups (cascades to members, exercises, performances)
      this.prisma.group.deleteMany({ where: { ownerId: id } }),
      // Finally delete the user
      this.prisma.user.delete({ where: { id } }),
    ])

    return true
  }

  async deleteExercise(id: string) {
    return this.exercisesService.adminDelete(id)
  }

  async listGroups(page = 1, limit = 20) {
    return this.groupsService.adminFindAll(page, limit)
  }

  async listUsers(page = 1, limit = 20) {
    return this.usersService.findAll(page, limit)
  }

  async listExercises(page = 1, limit = 20) {
    return this.exercisesService.adminFindAll(page, limit)
  }
}
