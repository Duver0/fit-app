import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RoutinesService {
  constructor(private prisma: PrismaService) {}

  async toggleRoutine(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { routineEnabled: enabled },
    })
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

    // Verify user has a performance record for this exercise
    const performance = await this.prisma.performanceRecord.findUnique({
      where: {
        exerciseId_userId_groupId: {
          exerciseId,
          userId,
          groupId: exercise.groupId,
        },
      },
    })
    if (!performance) {
      throw new BadRequestException(
        'You must have a registered mark for this exercise before adding it to your routine',
      )
    }

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

  async getExercisesForRoutine(userId: string) {
    // Get all performances of the user with their exercises and groups
    const performances = await this.prisma.performanceRecord.findMany({
      where: { userId },
      include: {
        exercise: {
          include: {
            group: true,
          },
        },
      },
    })

    // Group by exercise (a user has only one performance per exercise per group)
    // Map to return exercise + performance info
    return performances.map((perf) => ({
      id: perf.exercise.id,
      name: perf.exercise.name,
      unit: perf.exercise.unit,
      imageUrl: perf.exercise.imageUrl,
      groupId: perf.exercise.groupId,
      group: perf.exercise.group,
      myPerformance: {
        id: perf.id,
        value: perf.value,
        reps: perf.reps,
        weight: perf.weight,
      },
    }))
  }
}
