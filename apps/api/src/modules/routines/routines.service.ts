import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RoutinesService {
  private readonly logger = new Logger(RoutinesService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * @deprecated Flag routineEnabled irrelevante: la rutina siempre es visible.
   * Mantenido como no-op seguro/idempotente para no romper clientes viejos.
   * Siempre retorna el usuario; normaliza routineEnabled a true si quedó en false.
   */
  async toggleRoutine(userId: string, enabled: boolean) {
    this.logger.warn(
      `[LEGACY] toggleRoutine llamado para user ${userId} con enabled=${enabled}. ` +
        `Flag deprecado (rutina siempre visible). No-op: se ignora el valor recibido.`,
    )
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (!user.routineEnabled) {
      return this.prisma.user.update({
        where: { id: userId },
        data: { routineEnabled: true },
      })
    }
    return user
  }

  async toggleSingleGroupAutoEnter(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { singleGroupAutoEnter: enabled },
    })
  }

  async getRoutineDays(userId: string) {
    const days = await this.prisma.routineDay.findMany({
      where: { userId },
      include: {
        exercises: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: {
              include: {
                group: true,
              },
            },
          },
        },
      },
      orderBy: { dayOfWeek: 'asc' },
    })

    // Attach myPerformance for each exercise
    return Promise.all(
      days.map(async (day) => ({
        ...day,
        exercises: await Promise.all(
          day.exercises.map(async (re) => ({
            ...re,
            myPerformance: await this.prisma.performanceRecord.findUnique({
              where: {
                exerciseId_userId_groupId: {
                  exerciseId: re.exerciseId,
                  userId,
                  groupId: re.exercise.groupId,
                },
              },
            }),
          })),
        ),
      })),
    )
  }

  async getRoutineDay(userId: string, dayOfWeek: number) {
    const day = await this.prisma.routineDay.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
      include: {
        exercises: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercise: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    })

    if (!day) return null

    return {
      ...day,
      exercises: await Promise.all(
        day.exercises.map(async (re) => ({
          ...re,
          myPerformance: await this.prisma.performanceRecord.findUnique({
            where: {
              exerciseId_userId_groupId: {
                exerciseId: re.exerciseId,
                userId,
                groupId: re.exercise.groupId,
              },
            },
          }),
        })),
      ),
    }
  }

  async addExerciseToDay(userId: string, dayOfWeek: number, exerciseId: string) {
    // Verify exercise exists
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    })
    if (!exercise) {
      throw new NotFoundException('Exercise not found')
    }

    // Verify user is member of the exercise's group
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId },
    })
    if (!membership) {
      throw new ForbiddenException('You are not a member of this exercise group')
    }

    // Auto-create a performance record with value 0 if none exists
    const performance = await this.prisma.performanceRecord.upsert({
      where: {
        exerciseId_userId_groupId: {
          exerciseId,
          userId,
          groupId: exercise.groupId,
        },
      },
      update: {},
      create: {
        exerciseId,
        userId,
        groupId: exercise.groupId,
        value: 0,
      },
    })

    // Get or create routine day
    const day = await this.prisma.routineDay.upsert({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
      update: {},
      create: { userId, dayOfWeek },
    })

    // Check if exercise is already in this day
    const existing = await this.prisma.routineExercise.findUnique({
      where: { dayId_exerciseId: { dayId: day.id, exerciseId } },
    })
    if (existing) {
      throw new BadRequestException('This exercise is already in your routine for this day')
    }

    // Get max sort order
    const lastExercise = await this.prisma.routineExercise.findFirst({
      where: { dayId: day.id },
      orderBy: { sortOrder: 'desc' },
    })
    const nextSortOrder = (lastExercise?.sortOrder ?? -1) + 1

    // Create routine exercise
    await this.prisma.routineExercise.create({
      data: {
        dayId: day.id,
        exerciseId,
        sortOrder: nextSortOrder,
      },
    })

    return this.getRoutineDay(userId, dayOfWeek)
  }

  async removeExerciseFromDay(userId: string, dayOfWeek: number, exerciseId: string) {
    // Find the routine exercise
    const day = await this.prisma.routineDay.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
    })
    if (!day) {
      throw new NotFoundException('Routine day not found')
    }

    const routineExercise = await this.prisma.routineExercise.findUnique({
      where: { dayId_exerciseId: { dayId: day.id, exerciseId } },
    })
    if (!routineExercise) {
      throw new NotFoundException('Exercise not found in this routine day')
    }

    // Delete it
    await this.prisma.routineExercise.delete({
      where: { id: routineExercise.id },
    })

    return this.getRoutineDay(userId, dayOfWeek)
  }

  async reorderExercises(userId: string, dayOfWeek: number, exerciseIds: string[]) {
    const day = await this.prisma.routineDay.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
    })
    if (!day) {
      throw new NotFoundException('Routine day not found')
    }

    // Verify all exercises belong to this day and update sort orders
    await this.prisma.$transaction(
      exerciseIds.map((exerciseId, index) =>
        this.prisma.routineExercise.update({
          where: { dayId_exerciseId: { dayId: day.id, exerciseId } },
          data: { sortOrder: index },
        }),
      ),
    )

    return this.getRoutineDay(userId, dayOfWeek)
  }

  async updateDayName(userId: string, dayOfWeek: number, name: string | null) {
    const day = await this.prisma.routineDay.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
    })
    if (!day) {
      throw new NotFoundException('Routine day not found')
    }

    return this.prisma.routineDay.update({
      where: { id: day.id },
      data: { name: name || null },
    })
  }

  private assertDayOfWeek(n: number) {
    if (!Number.isInteger(n) || n < 0 || n > 6)
      throw new BadRequestException('dayOfWeek must be between 0 and 6')
  }

  async swapRoutineDays(userId: string, fromDayOfWeek: number, toDayOfWeek: number) {
    this.assertDayOfWeek(fromDayOfWeek)
    this.assertDayOfWeek(toDayOfWeek)
    if (fromDayOfWeek === toDayOfWeek) {
      throw new BadRequestException('Cannot move routine to the same day')
    }

    // Verify source day exists and has exercises
    const source = await this.prisma.routineDay.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek: fromDayOfWeek } },
      include: { exercises: true },
    })
    if (!source || source.exercises.length === 0) {
      throw new NotFoundException('Source day has no exercises to move')
    }

    const target = await this.prisma.routineDay.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek: toDayOfWeek } },
      include: { exercises: true },
    })
    const targetHasContent = !!target && target.exercises.length > 0

    if (!targetHasContent) {
      // — Move simple (destino inexistente o vacío) —
      await this.prisma.$transaction(async (tx) => {
        if (target) {
          this.logger.warn(
            `swapRoutineDays: removing empty orphan row ${target.id} (user ${userId}, day ${toDayOfWeek})`,
          )
          await tx.routineDay.delete({ where: { id: target.id } })
        }
        await tx.routineDay.update({
          where: { id: source.id },
          data: { dayOfWeek: toDayOfWeek },
        })
      })
      return this.getRoutineDay(userId, toDayOfWeek)
    }

    // — Swap real A↔B (ambos con contenido): dayOfWeek viaja con la fila,
    // el name viaja con el contenido automáticamente al estar en la misma fila. —
    await this.prisma.$transaction(async (tx) => {
      await tx.routineDay.update({ where: { id: source.id }, data: { dayOfWeek: -1 } })
      await tx.routineDay.update({ where: { id: target!.id }, data: { dayOfWeek: fromDayOfWeek } })
      await tx.routineDay.update({ where: { id: source.id }, data: { dayOfWeek: toDayOfWeek } })
    })
    return this.getRoutineDay(userId, toDayOfWeek)
  }

  async deleteRoutineDay(userId: string, dayOfWeek: number): Promise<boolean> {
    this.assertDayOfWeek(dayOfWeek)
    const day = await this.prisma.routineDay.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
      include: { exercises: { select: { id: true } } },
    })
    if (!day || day.exercises.length === 0)
      throw new NotFoundException('Routine day not found')
    // Cascada de RoutineExercise por onDelete: Cascade; PerformanceRecord intactos.
    await this.prisma.routineDay.delete({ where: { id: day.id } })
    return true
  }

  async getExercisesForRoutine(userId: string) {
    // Get all groups the user belongs to
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            exercises: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    })

    // Flatten all exercises from all groups
    const exercises = memberships.flatMap((m) => m.group.exercises)

    // Get user's performances for these exercises
    const performances = await this.prisma.performanceRecord.findMany({
      where: { userId },
    })
    const perfMap = new Map(performances.map((p) => [p.exerciseId, p]))

    // Deduplicate by exerciseId (same exercise can't be in multiple groups)
    const seen = new Set<string>()

    return exercises
      .filter((ex) => {
        if (seen.has(ex.id)) return false
        seen.add(ex.id)
        return true
      })
      .map((ex) => {
        const perf = perfMap.get(ex.id)
        return {
          id: ex.id,
          name: ex.name,
          unit: ex.unit,
          imageUrl: ex.imageUrl,
          groupId: ex.groupId,
          group: ex.group,
          myPerformance: perf
            ? {
                id: perf.id,
                value: perf.value,
                reps: perf.reps,
                weight: perf.weight,
              }
            : null,
        }
      })
  }
}
