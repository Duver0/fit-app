import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ExerciseUnit } from '@prisma/client'

@Injectable()
export class PerformanceService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async upsert(userId: string, input: { exerciseId: string; value?: number; reps?: number; weight?: number }) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: input.exerciseId },
    })
    if (!exercise) throw new NotFoundException('Exercise not found')

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('You are not a member of this group')

    // Para ejercicios REPS_AND_WEIGHT: se requiere reps y weight, se calcula value = reps × weight (volumen)
    if (exercise.unit === ExerciseUnit.REPS_AND_WEIGHT) {
      if (input.reps == null || input.weight == null) {
        throw new BadRequestException('Para ejercicios de reps+peso, debes proporcionar reps y weight')
      }
      if (input.reps < 1) {
        throw new BadRequestException('Las repeticiones deben ser al menos 1')
      }
      if (input.weight <= 0) {
        throw new BadRequestException('El peso debe ser mayor a 0')
      }
      input.value = input.reps * input.weight
    } else {
      // Para ejercicios con unidad simple, se requiere value
      if (input.value == null) {
        throw new BadRequestException('Debes proporcionar un valor para este tipo de ejercicio')
      }
    }

    const existing = await this.prisma.performanceRecord.findUnique({
      where: { exerciseId_userId_groupId: { exerciseId: input.exerciseId, userId, groupId: exercise.groupId } },
    })

    // Construir los campos a actualizar/crear (sin incluir relaciones)
    const scalarFields: { value: number; reps?: number | null; weight?: number | null } = {
      value: input.value,
    }
    if (exercise.unit === ExerciseUnit.REPS_AND_WEIGHT) {
      scalarFields.reps = input.reps
      scalarFields.weight = input.weight
    }

    let record: any

    if (existing) {
      record = await this.prisma.performanceRecord.update({
        where: { id: existing.id },
        data: scalarFields,
      })
    } else {
      record = await this.prisma.performanceRecord.create({
        data: {
          exerciseId: input.exerciseId,
          userId,
          groupId: exercise.groupId,
          ...scalarFields,
        },
      })
    }

    return record
  }

  async findByUserAndExercise(userId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } })
    if (!exercise) return null
    return this.prisma.performanceRecord.findUnique({
      where: { exerciseId_userId_groupId: { exerciseId, userId, groupId: exercise.groupId } },
    })
  }
}
