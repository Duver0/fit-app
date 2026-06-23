import { Injectable } from '@nestjs/common'
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
    await this.prisma.user.delete({ where: { id } })
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
