import { Test, TestingModule } from '@nestjs/testing'
import { RoutinesService } from './routines.service'
import { PrismaService } from '../../prisma/prisma.service'
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { ExerciseUnit, GroupMemberRole } from '@prisma/client'

describe('RoutinesService', () => {
  let service: RoutinesService
  let prisma: PrismaService

  const mockUser = {
    id: 'user-1',
    auth0Id: 'auth0|123',
    passwordHash: null,
    email: 'user@test.com',
    name: 'Test User',
    phone: null,
    avatarUrl: null,
    role: 'USER',
    routineEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockExercise = {
    id: 'exercise-1',
    groupId: 'group-1',
    categoryId: null,
    name: 'Bench Press',
    unit: ExerciseUnit.KG,
    imageUrl: null,
    createdBy: 'user-1',
    wgerId: null,
    wgerCategory: null,
    wgerMuscles: null,
    wgerEquipment: null,
    wgerInstructions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockMembership = {
    id: 'gm-1',
    userId: 'user-1',
    groupId: 'group-1',
    role: GroupMemberRole.MEMBER,
    joinedAt: new Date(),
  }

  const mockPerformance = {
    id: 'perf-1',
    exerciseId: 'exercise-1',
    userId: 'user-1',
    groupId: 'group-1',
    value: 100,
    reps: null,
    weight: null,
    recordedAt: new Date(),
    updatedAt: new Date(),
  }

  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    description: null,
    avatarUrl: null,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockRoutineExercise: any = {
    id: 're-1',
    dayId: 'day-1',
    exerciseId: 'exercise-1',
    sortOrder: 0,
    createdAt: new Date(),
    exercise: {
      ...mockExercise,
      group: mockGroup,
    },
  }

  const mockDay: any = {
    id: 'day-1',
    userId: 'user-1',
    dayOfWeek: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockDayWithExercises: any = {
    ...mockDay,
    exercises: [mockRoutineExercise],
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutinesService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              update: jest.fn(),
            },
            routineDay: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            routineExercise: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findMany: jest.fn(),
            },
            exercise: {
              findUnique: jest.fn(),
            },
            groupMember: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            performanceRecord: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<RoutinesService>(RoutinesService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('toggleRoutine', () => {
    it('debería habilitar la rutina (setear routineEnabled = true)', async () => {
      const updatedUser = { ...mockUser, routineEnabled: true }
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser as any)

      const result = await service.toggleRoutine('user-1', true)

      expect(result.routineEnabled).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { routineEnabled: true },
      })
    })

    it('debería deshabilitar la rutina (setear routineEnabled = false)', async () => {
      const updatedUser = { ...mockUser, routineEnabled: false }
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser as any)

      const result = await service.toggleRoutine('user-1', false)

      expect(result.routineEnabled).toBe(false)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { routineEnabled: false },
      })
    })
  })

  describe('getRoutineDays', () => {
    it('debería retornar los días del usuario con ejercicios ordenados', async () => {
      jest
        .spyOn(prisma.routineDay, 'findMany')
        .mockResolvedValue([mockDayWithExercises])

      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue(mockPerformance as any)

      const result = await service.getRoutineDays('user-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('day-1')
      expect(result[0].dayOfWeek).toBe(1)
      expect(result[0].exercises).toHaveLength(1)
      expect(result[0].exercises[0].id).toBe('re-1')
      expect(result[0].exercises[0].sortOrder).toBe(0)
      expect(result[0].exercises[0].myPerformance).toEqual(mockPerformance)
      expect(result[0].exercises[0].exercise.id).toBe('exercise-1')

      expect(prisma.routineDay.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
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

      expect(prisma.performanceRecord.findUnique).toHaveBeenCalledWith({
        where: {
          exerciseId_userId_groupId: {
            exerciseId: 'exercise-1',
            userId: 'user-1',
            groupId: 'group-1',
          },
        },
      })
    })

    it('debería retornar lista vacía si no tiene días', async () => {
      jest.spyOn(prisma.routineDay, 'findMany').mockResolvedValue([])

      const result = await service.getRoutineDays('user-1')

      expect(result).toEqual([])
      expect(prisma.routineDay.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
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
    })
  })

  describe('getRoutineDay', () => {
    it('debería retornar el día con ejercicios si existe', async () => {
      jest
        .spyOn(prisma.routineDay, 'findUnique')
        .mockResolvedValue(mockDayWithExercises)

      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue(mockPerformance as any)

      const result = await service.getRoutineDay('user-1', 1)

      expect(result).not.toBeNull()
      expect(result!.id).toBe('day-1')
      expect(result!.dayOfWeek).toBe(1)
      expect(result!.exercises).toHaveLength(1)
      expect(result!.exercises[0].myPerformance).toEqual(mockPerformance)
      expect(result!.exercises[0].exercise.id).toBe('exercise-1')

      expect(prisma.routineDay.findUnique).toHaveBeenCalledWith({
        where: { userId_dayOfWeek: { userId: 'user-1', dayOfWeek: 1 } },
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
    })

    it('debería retornar null si el día no existe', async () => {
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(null)

      const result = await service.getRoutineDay('user-1', 99)

      expect(result).toBeNull()
    })
  })

  describe('addExerciseToDay', () => {
    it('debería crear el día si no existe y agregar el ejercicio', async () => {
      jest
        .spyOn(prisma.exercise, 'findUnique')
        .mockResolvedValue(mockExercise as any)
      jest
        .spyOn(prisma.groupMember, 'findFirst')
        .mockResolvedValue(mockMembership as any)
      jest
        .spyOn(prisma.performanceRecord, 'upsert')
        .mockResolvedValue(mockPerformance as any)
      jest.spyOn(prisma.routineDay, 'upsert').mockResolvedValue(mockDay)
      jest
        .spyOn(prisma.routineExercise, 'findUnique')
        .mockResolvedValue(null)
      jest
        .spyOn(prisma.routineExercise, 'findFirst')
        .mockResolvedValue(null)
      jest
        .spyOn(prisma.routineExercise, 'create')
        .mockResolvedValue(mockRoutineExercise)

      // getRoutineDay internally called at the end
      jest
        .spyOn(prisma.routineDay, 'findUnique')
        .mockResolvedValue(mockDayWithExercises)
      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue(mockPerformance as any)

      const result = await service.addExerciseToDay('user-1', 1, 'exercise-1')

      expect(result!.id).toBe('day-1')
      expect(result!.exercises).toHaveLength(1)

      expect(prisma.exercise.findUnique).toHaveBeenCalledWith({
        where: { id: 'exercise-1' },
      })
      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', userId: 'user-1' },
      })
      expect(prisma.performanceRecord.upsert).toHaveBeenCalledWith({
        where: {
          exerciseId_userId_groupId: {
            exerciseId: 'exercise-1',
            userId: 'user-1',
            groupId: 'group-1',
          },
        },
        update: {},
        create: {
          exerciseId: 'exercise-1',
          userId: 'user-1',
          groupId: 'group-1',
          value: 0,
        },
      })
      expect(prisma.routineDay.upsert).toHaveBeenCalledWith({
        where: { userId_dayOfWeek: { userId: 'user-1', dayOfWeek: 1 } },
        update: {},
        create: { userId: 'user-1', dayOfWeek: 1 },
      })
      expect(prisma.routineExercise.create).toHaveBeenCalledWith({
        data: {
          dayId: 'day-1',
          exerciseId: 'exercise-1',
          sortOrder: 0,
        },
      })
    })

    it('debería asignar sortOrder consecutivo cuando ya existen ejercicios', async () => {
      jest
        .spyOn(prisma.exercise, 'findUnique')
        .mockResolvedValue(mockExercise as any)
      jest
        .spyOn(prisma.groupMember, 'findFirst')
        .mockResolvedValue(mockMembership as any)
      jest
        .spyOn(prisma.performanceRecord, 'upsert')
        .mockResolvedValue(mockPerformance as any)
      jest.spyOn(prisma.routineDay, 'upsert').mockResolvedValue(mockDay)
      jest
        .spyOn(prisma.routineExercise, 'findUnique')
        .mockResolvedValue(null)
      jest
        .spyOn(prisma.routineExercise, 'findFirst')
        .mockResolvedValue({ ...mockRoutineExercise, sortOrder: 2 })

      jest
        .spyOn(prisma.routineExercise, 'create')
        .mockResolvedValue({ ...mockRoutineExercise, sortOrder: 3 })

      jest
        .spyOn(prisma.routineDay, 'findUnique')
        .mockResolvedValue(mockDayWithExercises)
      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue(mockPerformance as any)

      await service.addExerciseToDay('user-1', 1, 'exercise-1')

      expect(prisma.routineExercise.create).toHaveBeenCalledWith({
        data: {
          dayId: 'day-1',
          exerciseId: 'exercise-1',
          sortOrder: 3,
        },
      })
    })

    it('debería lanzar NotFoundException si el ejercicio no existe', async () => {
      jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(null)

      await expect(
        service.addExerciseToDay('user-1', 1, 'nonexistent'),
      ).rejects.toThrow(NotFoundException)

      expect(prisma.exercise.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      })
    })

    it('debería lanzar ForbiddenException si el usuario no es miembro del grupo', async () => {
      jest
        .spyOn(prisma.exercise, 'findUnique')
        .mockResolvedValue(mockExercise as any)
      jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)

      await expect(
        service.addExerciseToDay('user-2', 1, 'exercise-1'),
      ).rejects.toThrow(ForbiddenException)

      expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-1', userId: 'user-2' },
      })
    })

    it('debería auto-crear performance con value 0 si no existe marca registrada', async () => {
      jest
        .spyOn(prisma.exercise, 'findUnique')
        .mockResolvedValue(mockExercise as any)
      jest
        .spyOn(prisma.groupMember, 'findFirst')
        .mockResolvedValue(mockMembership as any)
      jest
        .spyOn(prisma.performanceRecord, 'upsert')
        .mockResolvedValue({
          ...mockPerformance,
          value: 0,
          id: 'perf-auto',
        } as any)
      jest.spyOn(prisma.routineDay, 'upsert').mockResolvedValue(mockDay)
      jest
        .spyOn(prisma.routineExercise, 'findUnique')
        .mockResolvedValue(null)
      jest
        .spyOn(prisma.routineExercise, 'findFirst')
        .mockResolvedValue(null)
      jest
        .spyOn(prisma.routineExercise, 'create')
        .mockResolvedValue(mockRoutineExercise)

      // getRoutineDay internally called at the end
      jest
        .spyOn(prisma.routineDay, 'findUnique')
        .mockResolvedValue(mockDayWithExercises)
      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue({ ...mockPerformance, value: 0 } as any)

      const result = await service.addExerciseToDay('user-1', 1, 'exercise-1')

      expect(result).not.toBeNull()
      expect(prisma.performanceRecord.upsert).toHaveBeenCalledWith({
        where: {
          exerciseId_userId_groupId: {
            exerciseId: 'exercise-1',
            userId: 'user-1',
            groupId: 'group-1',
          },
        },
        update: {},
        create: {
          exerciseId: 'exercise-1',
          userId: 'user-1',
          groupId: 'group-1',
          value: 0,
        },
      })
    })

    it('debería lanzar BadRequestException si ya existe el ejercicio en ese día', async () => {
      jest
        .spyOn(prisma.exercise, 'findUnique')
        .mockResolvedValue(mockExercise as any)
      jest
        .spyOn(prisma.groupMember, 'findFirst')
        .mockResolvedValue(mockMembership as any)
      jest
        .spyOn(prisma.performanceRecord, 'upsert')
        .mockResolvedValue(mockPerformance as any)
      jest.spyOn(prisma.routineDay, 'upsert').mockResolvedValue(mockDay)
      jest
        .spyOn(prisma.routineExercise, 'findUnique')
        .mockResolvedValue(mockRoutineExercise)

      await expect(
        service.addExerciseToDay('user-1', 1, 'exercise-1'),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('removeExerciseFromDay', () => {
    it('debería eliminar un ejercicio del día', async () => {
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(mockDay)
      jest
        .spyOn(prisma.routineExercise, 'findUnique')
        .mockResolvedValue(mockRoutineExercise)
      jest
        .spyOn(prisma.routineExercise, 'delete')
        .mockResolvedValue(mockRoutineExercise)

      // getRoutineDay internally called at the end
      jest
        .spyOn(prisma.routineDay, 'findUnique')
        .mockResolvedValue(mockDayWithExercises)
      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue(mockPerformance as any)

      const result = await service.removeExerciseFromDay(
        'user-1',
        1,
        'exercise-1',
      )

      expect(result!.id).toBe('day-1')
      expect(prisma.routineDay.findUnique).toHaveBeenCalledWith({
        where: { userId_dayOfWeek: { userId: 'user-1', dayOfWeek: 1 } },
      })
      expect(prisma.routineExercise.findUnique).toHaveBeenCalledWith({
        where: {
          dayId_exerciseId: { dayId: 'day-1', exerciseId: 'exercise-1' },
        },
      })
      expect(prisma.routineExercise.delete).toHaveBeenCalledWith({
        where: { id: 're-1' },
      })
    })

    it('debería lanzar NotFoundException si el día no existe', async () => {
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(null)

      await expect(
        service.removeExerciseFromDay('user-1', 99, 'exercise-1'),
      ).rejects.toThrow(NotFoundException)

      expect(prisma.routineDay.findUnique).toHaveBeenCalledWith({
        where: { userId_dayOfWeek: { userId: 'user-1', dayOfWeek: 99 } },
      })
    })

    it('debería lanzar NotFoundException si el ejercicio no está en el día', async () => {
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(mockDay)
      jest
        .spyOn(prisma.routineExercise, 'findUnique')
        .mockResolvedValue(null)

      await expect(
        service.removeExerciseFromDay('user-1', 1, 'nonexistent'),
      ).rejects.toThrow(NotFoundException)

      expect(prisma.routineExercise.findUnique).toHaveBeenCalledWith({
        where: {
          dayId_exerciseId: { dayId: 'day-1', exerciseId: 'nonexistent' },
        },
      })
    })
  })

  describe('reorderExercises', () => {
    it('debería actualizar el orden de los ejercicios', async () => {
      const exerciseIds = ['exercise-2', 'exercise-1']

      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(mockDay)
      jest
        .spyOn(prisma.routineExercise, 'update')
        .mockResolvedValue(mockRoutineExercise)

      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async (updates: any) => {
          return Promise.all(updates.map((u: any) => u))
        })

      // getRoutineDay internally called at the end
      const reorderedDay: any = {
        ...mockDayWithExercises,
        exercises: [
          { ...mockRoutineExercise, exerciseId: 'exercise-2', sortOrder: 0 },
          { ...mockRoutineExercise, exerciseId: 'exercise-1', sortOrder: 1 },
        ],
      }
      jest
        .spyOn(prisma.routineDay, 'findUnique')
        .mockResolvedValue(reorderedDay)
      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue(mockPerformance as any)

      const result = await service.reorderExercises(
        'user-1',
        1,
        exerciseIds,
      )

      expect(result!.id).toBe('day-1')
      expect(prisma.routineDay.findUnique).toHaveBeenCalledWith({
        where: { userId_dayOfWeek: { userId: 'user-1', dayOfWeek: 1 } },
      })
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(prisma.routineExercise.update).toHaveBeenCalledTimes(2)
      expect(prisma.routineExercise.update).toHaveBeenNthCalledWith(1, {
        where: {
          dayId_exerciseId: { dayId: 'day-1', exerciseId: 'exercise-2' },
        },
        data: { sortOrder: 0 },
      })
      expect(prisma.routineExercise.update).toHaveBeenNthCalledWith(2, {
        where: {
          dayId_exerciseId: { dayId: 'day-1', exerciseId: 'exercise-1' },
        },
        data: { sortOrder: 1 },
      })
    })

    it('debería lanzar NotFoundException si el día no existe', async () => {
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(null)

      await expect(
        service.reorderExercises('user-1', 99, ['exercise-1']),
      ).rejects.toThrow(NotFoundException)

      expect(prisma.routineDay.findUnique).toHaveBeenCalledWith({
        where: { userId_dayOfWeek: { userId: 'user-1', dayOfWeek: 99 } },
      })
    })
  })

  describe('swapRoutineDays', () => {
    const mockSourceDay: any = {
      id: 'day-1',
      userId: 'user-1',
      dayOfWeek: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [mockRoutineExercise],
    }

    it('debería mover los ejercicios del día origen al día destino', async () => {
      // Source day has exercises
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(mockSourceDay)
      // Target day (or create)
      jest.spyOn(prisma.routineDay, 'upsert').mockResolvedValue({
        ...mockSourceDay,
        id: 'day-2',
        dayOfWeek: 2,
      })
      // Target day has no exercises
      jest.spyOn(prisma.routineExercise, 'findMany').mockResolvedValue([])
      jest.spyOn(prisma.routineExercise, 'updateMany').mockResolvedValue({
        count: 1,
      } as any)
      jest.spyOn(prisma.routineDay, 'deleteMany').mockResolvedValue({
        count: 1,
      } as any)

      // getRoutineDay final call
      const targetDayWithExercises: any = {
        ...mockSourceDay,
        id: 'day-2',
        dayOfWeek: 2,
        exercises: [mockRoutineExercise],
      }
      jest
        .spyOn(prisma.routineDay, 'findUnique')
        .mockResolvedValueOnce(mockSourceDay)
        .mockResolvedValueOnce(targetDayWithExercises)
      jest
        .spyOn(prisma.performanceRecord, 'findUnique')
        .mockResolvedValue(mockPerformance as any)

      const result = await service.swapRoutineDays('user-1', 1, 2)

      expect(result!.id).toBe('day-2')
      expect(result!.dayOfWeek).toBe(2)
      expect(result!.exercises).toHaveLength(1)
      expect(prisma.routineExercise.updateMany).toHaveBeenCalledWith({
        where: { dayId: 'day-1' },
        data: { dayId: 'day-2' },
      })
      expect(prisma.routineDay.deleteMany).toHaveBeenCalledWith({
        where: { id: 'day-1', userId: 'user-1' },
      })
    })

    it('debería lanzar BadRequestException si desde y hacia son el mismo día', async () => {
      await expect(
        service.swapRoutineDays('user-1', 1, 1),
      ).rejects.toThrow(BadRequestException)
    })

    it('debería lanzar NotFoundException si el día origen no tiene ejercicios', async () => {
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue({
        ...mockSourceDay,
        exercises: [],
      })

      await expect(
        service.swapRoutineDays('user-1', 1, 2),
      ).rejects.toThrow(NotFoundException)
    })

    it('debería lanzar NotFoundException si el día origen no existe', async () => {
      jest.spyOn(prisma.routineDay, 'findUnique').mockResolvedValue(null)

      await expect(
        service.swapRoutineDays('user-1', 1, 2),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
