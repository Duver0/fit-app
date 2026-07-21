import { Injectable, Logger, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { GroupsService } from '../groups/groups.service'
import { ExercisesService } from '../exercises/exercises.service'
import { UsersService } from '../users/users.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private prisma: PrismaService,
    private groupsService: GroupsService,
    private exercisesService: ExercisesService,
    private usersService: UsersService,
  ) {}

  async deleteGroup(id: string, adminId: string) {
    const group = await this.prisma.group.findUnique({ where: { id } })
    if (!group) throw new NotFoundException('Grupo no encontrado')

    try {
      await this.prisma.group.delete({ where: { id } })
      this.logger.log(`Group ${id} deleted by admin ${adminId}`)
      return true
    } catch (e) {
      this.logger.error(`Error deleting group ${id}: ${e instanceof Error ? e.message : e}`)
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw new NotFoundException('Grupo no encontrado')
      }
      throw new InternalServerErrorException('Error al eliminar el grupo')
    }
  }

  async updateGroup(id: string, data: { name?: string; description?: string }) {
    return this.groupsService.adminUpdate(id, data)
  }

  async deleteUser(id: string, adminId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new ConflictException('Usuario no encontrado')

    // Evitar que un admin se elimine a sí mismo
    if (id === adminId) {
      throw new ConflictException('No puedes eliminarte a ti mismo')
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete memberships
        await tx.groupMember.deleteMany({ where: { userId: id } })
        // Delete performance records (disputes cascade via onDelete)
        await tx.performanceRecord.deleteMany({ where: { userId: id } })
        // Delete dispute votes cast by this user
        await tx.disputeVote.deleteMany({ where: { userId: id } })
        // Delete invitations sent by this user
        await tx.invitation.deleteMany({ where: { inviterId: id } })
        // Delete disputes initiated by this user
        await tx.dispute.deleteMany({ where: { initiatedById: id } })
        // Delete exercises created by this user
        await tx.exercise.deleteMany({ where: { createdBy: id } })
        // Delete groups owned by this user (cascades to members, exercises, performances, invitations)
        await tx.group.deleteMany({ where: { ownerId: id } })
        // Finally delete the user
        await tx.user.delete({ where: { id } })
      })

      this.logger.log(`User ${id} (${user.email}) deleted by admin ${adminId}`)
      return true
    } catch (e) {
      this.logger.error(`Error deleting user ${id}: ${e instanceof Error ? e.message : e}`)
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw new NotFoundException('Usuario no encontrado')
        if (e.code === 'P2003') {
          throw new InternalServerErrorException(
            'No se pudo eliminar el usuario debido a restricciones de integridad. ' +
            'Asegurate de que no tenga grupos, ejercicios o disputas referenciados.',
          )
        }
      }
      throw new InternalServerErrorException('Error al eliminar el usuario')
    }
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
