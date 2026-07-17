# Exercise Refactor — Backend (NestJS)

> **Estado: ✅ COMPLETADO**

## Objetivo
Actualizar el modelo GraphQL de Exercise, el input, el service y el resolver para soportar `imageUrl`.

## Dependencias
- `01-database.md` y `02-api.md` deben completarse primero.

## Backend

### Archivos a modificar

#### 1. `apps/api/src/common/models/exercise.model.ts`

**Cambio**: Agregar campo `imageUrl` al ObjectType `Exercise`.

```typescript
// Fragmento: después del campo `unit`
@Field({ nullable: true })
imageUrl?: string
```

**Diff completo del archivo**:

```typescript
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql'
import { ExerciseUnit } from '@prisma/client'
import { User } from './user.model'

export { ExerciseUnit }

registerEnumType(ExerciseUnit, { name: 'ExerciseUnit' })

@ObjectType()
export class Exercise {
  @Field(() => ID)
  id: string

  @Field()
  groupId: string

  @Field()
  name: string

  @Field(() => ExerciseUnit)
  unit: ExerciseUnit

  @Field({ nullable: true })        // ← NUEVO
  imageUrl?: string                  // ← NUEVO

  @Field(() => User)
  createdBy: User

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@ObjectType()
export class ExerciseConnection {
  @Field(() => [Exercise])
  items: Exercise[]

  @Field()
  totalCount: number

  @Field()
  currentPage: number

  @Field()
  totalPages: number
}
```

#### 2. `apps/api/src/modules/exercises/dto/exercise.input.ts`

**Cambio**: Agregar `imageUrl` opcional al `CreateExerciseInput`.

```typescript
import { InputType, Field } from '@nestjs/graphql'
import { IsUUID, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsUrl } from 'class-validator'
import { ExerciseUnit } from '@prisma/client'

@InputType()
export class CreateExerciseInput {
  @Field()
  @IsUUID()
  groupId: string

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(ExerciseUnit)
  unit?: string

  @Field({ nullable: true })           // ← NUEVO
  @IsOptional()                         // ← NUEVO
  @IsUrl({}, { message: 'Debe ser una URL válida' })  // ← NUEVO (opcional, validar si se provee)
  imageUrl?: string                     // ← NUEVO
}
```

#### 3. `apps/api/src/modules/exercises/exercises.service.ts`

**Cambio**: Pasar `imageUrl` al `create` y agregar método `updateImage`.

```typescript
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ExerciseUnit } from '@prisma/client'

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findByGroup(groupId: string) {
    return this.prisma.exercise.findMany({
      where: { groupId },
      include: { creator: true },
    })
  }

  async findById(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: { creator: true },
    })
    if (!exercise) throw new NotFoundException()
    return exercise
  }

  async create(userId: string, data: { groupId: string; name: string; unit?: string; imageUrl?: string }) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('You must be a group member to create exercises')

    return this.prisma.exercise.create({
      data: {
        groupId: data.groupId,
        name: data.name,
        createdBy: userId,
        unit: (data.unit as ExerciseUnit) || ExerciseUnit.KG,
        imageUrl: data.imageUrl,        // ← NUEVO: se pasa si está definido
      },
    })
  }

  // NUEVO método
  async updateImage(id: string, userId: string, imageUrl: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException()

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId },
    })
    if (!membership) throw new ForbiddenException('You must be a group member to update exercise image')

    return this.prisma.exercise.update({
      where: { id },
      data: { imageUrl },
    })
  }

  async delete(id: string, userId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } })
    if (!exercise) throw new NotFoundException()

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId: exercise.groupId, userId, role: 'OWNER' },
    })
    if (!membership) throw new ForbiddenException()

    await this.prisma.exercise.delete({ where: { id } })
    return true
  }

  async adminDelete(id: string) {
    await this.prisma.exercise.delete({ where: { id } })
    return true
  }

  async adminFindAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [items, totalCount] = await Promise.all([
      this.prisma.exercise.findMany({ skip, take: limit, include: { group: true } }),
      this.prisma.exercise.count(),
    ])
    return { items, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) }
  }
}
```

#### 4. `apps/api/src/modules/exercises/exercises.resolver.ts`

**Cambio**: Agregar resolver para `updateExerciseImage`.

```typescript
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { ExercisesService } from './exercises.service'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Exercise } from '../../common/models'
import { CreateExerciseInput } from './dto/exercise.input'
import { User } from '../../common/models'

@Resolver()
@UseGuards(GqlAuthGuard)
export class ExercisesResolver {
  constructor(private exercisesService: ExercisesService) {}

  @Query(() => [Exercise])
  async exercises(@Args('groupId') groupId: string) {
    return this.exercisesService.findByGroup(groupId)
  }

  @Query(() => Exercise)
  async exercise(@Args('id') id: string) {
    return this.exercisesService.findById(id)
  }

  @Mutation(() => Exercise)
  async createExercise(
    @CurrentUser() user: User,
    @Args('input') input: CreateExerciseInput,
  ) {
    return this.exercisesService.create(user.id, input)
  }

  // NUEVO mutation
  @Mutation(() => Exercise)
  async updateExerciseImage(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('imageUrl') imageUrl: string,
  ) {
    return this.exercisesService.updateImage(id, user.id, imageUrl)
  }

  @Mutation(() => Boolean)
  async deleteExercise(@CurrentUser() user: User, @Args('id') id: string) {
    return this.exercisesService.delete(id, user.id)
  }
}
```

### Checklist de implementación

| Item | Estado |
|------|--------|
| `exercise.model.ts`: agregar `@Field({ nullable: true }) imageUrl?: string` | ✅ Completo |
| `exercise.input.ts`: agregar `imageUrl` opcional con validación `@IsUrl()` a `CreateExerciseInput` | ✅ Completo |
| `exercise.input.ts`: crear `UpdateExerciseImageInput` con `id` + `imageUrl` | ✅ Completo |
| `exercises.service.ts`: `create()` acepta y persiste `imageUrl` | ✅ Completo |
| `exercises.service.ts`: nuevo método `updateImage()` con validación de pertenencia al grupo | ✅ Completo |
| `exercises.resolver.ts`: importar `UpdateExerciseImageInput` | ✅ Completo |
| `exercises.resolver.ts`: nueva mutation `updateExerciseImage` | ✅ Completo |
| Compilación TypeScript sin errores | ✅ Completo (`tsc --noEmit` exitoso) |

### Resumen de cambios por archivo

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/common/models/exercise.model.ts` | Agregar `@Field({ nullable: true }) imageUrl?: string` |
| `apps/api/src/modules/exercises/dto/exercise.input.ts` | Agregar `@IsOptional() @IsUrl() imageUrl?: string` al `CreateExerciseInput` + nuevo `UpdateExerciseImageInput` |
| `apps/api/src/modules/exercises/exercises.service.ts` | Agregar `imageUrl` en `create()` + nuevo método `updateImage()` |
| `apps/api/src/modules/exercises/exercises.resolver.ts` | Agregar mutation `updateExerciseImage` |
