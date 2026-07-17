# Exercise Refactor — Tests

## Objetivo
Actualizar los tests existentes y agregar nuevos escenarios para cubrir el campo `imageUrl` y la mutation `updateExerciseImage`.

## Dependencias
- `03-backend.md` debe completarse primero.

## Tests

### Backend

#### Archivo: `apps/api/src/modules/exercises/exercises.service.spec.ts`

**Cambios necesarios**:

1. **mockExercise**: Agregar `imageUrl` al mock.
2. **Test `create`**: Verificar que `imageUrl` se pasa correctamente cuando se provee.
3. **Test `create`**: Verificar que se crea sin `imageUrl` cuando no se envía (null/undefined).
4. **Nuevo describe `updateImage`**: Tests para el método `updateImage`.

```typescript
// Mock actualizado
const mockExercise = {
  id: 'exercise-1',
  groupId: 'group-1',
  name: 'Bench Press',
  unit: ExerciseUnit.KG,
  imageUrl: null,                    // ← NUEVO
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockExerciseWithImage = {
  ...mockExercise,
  imageUrl: 'https://example.com/exercise.jpg',
}
```

**Nuevos tests en `describe('create')`**:

```typescript
it('should create exercise with imageUrl when provided', async () => {
  jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockOwnerMembership as any)
  jest.spyOn(prisma.exercise, 'create').mockResolvedValue(mockExerciseWithImage as any)

  const result = await service.create('user-1', {
    groupId: 'group-1',
    name: 'Bench Press',
    imageUrl: 'https://example.com/exercise.jpg',
  })
  expect(result.imageUrl).toBe('https://example.com/exercise.jpg')
  expect(prisma.exercise.create).toHaveBeenCalledWith({
    data: {
      groupId: 'group-1',
      name: 'Bench Press',
      createdBy: 'user-1',
      unit: ExerciseUnit.KG,
      imageUrl: 'https://example.com/exercise.jpg',
    },
  })
})

it('should create exercise without imageUrl when not provided', async () => {
  jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockOwnerMembership as any)
  jest.spyOn(prisma.exercise, 'create').mockResolvedValue(mockExercise as any)

  const result = await service.create('user-1', {
    groupId: 'group-1',
    name: 'Bench Press',
  })
  expect(result.imageUrl).toBeNull()
  expect(prisma.exercise.create).toHaveBeenCalledWith({
    data: {
      groupId: 'group-1',
      name: 'Bench Press',
      createdBy: 'user-1',
      unit: ExerciseUnit.KG,
      imageUrl: undefined,
    },
  })
})
```

**Nuevo describe `updateImage`**:

```typescript
describe('updateImage', () => {
  it('should update imageUrl when user is a group member', async () => {
    jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
    jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(mockMemberMembership as any)
    jest.spyOn(prisma.exercise, 'update').mockResolvedValue(mockExerciseWithImage as any)

    const result = await service.updateImage('exercise-1', 'user-2', 'https://example.com/new-image.jpg')
    expect(result.imageUrl).toBe('https://example.com/exercise.jpg')
    expect(prisma.exercise.update).toHaveBeenCalledWith({
      where: { id: 'exercise-1' },
      data: { imageUrl: 'https://example.com/new-image.jpg' },
    })
  })

  it('should throw NotFoundException when exercise does not exist', async () => {
    jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(null)

    await expect(
      service.updateImage('nonexistent', 'user-1', 'https://example.com/img.jpg'),
    ).rejects.toThrow(NotFoundException)
  })

  it('should throw ForbiddenException when user is not a group member', async () => {
    jest.spyOn(prisma.exercise, 'findUnique').mockResolvedValue(mockExercise)
    jest.spyOn(prisma.groupMember, 'findFirst').mockResolvedValue(null)

    await expect(
      service.updateImage('exercise-1', 'user-3', 'https://example.com/img.jpg'),
    ).rejects.toThrow(ForbiddenException)
  })
})
```

#### Archivo: `apps/api/src/modules/exercises/exercises.resolver.spec.ts`

Si existe el archivo de test del resolver, agregar:

```typescript
describe('updateExerciseImage', () => {
  it('should call service.updateImage with correct params', async () => {
    const mockUser = { id: 'user-1' }
    const result = await resolver.updateExerciseImage(mockUser as any, 'exercise-1', 'https://example.com/img.jpg')
    expect(service.updateImage).toHaveBeenCalledWith('exercise-1', 'user-1', 'https://example.com/img.jpg')
  })
})
```

### Frontend

#### Tests de componentes (si existen)

**Archivo**: `apps/mobile/app/(app)/groups/[groupId]/__tests__/index.test.tsx` (nuevo)

```typescript
// Escenarios a probar:
// 1. Renderiza lista vacía cuando no hay ejercicios
// 2. Renderiza tarjeta de ejercicio con placeholder cuando no tiene imageUrl
// 3. Renderiza tarjeta de ejercicio con Image cuando tiene imageUrl
// 4. Al tocar un ejercicio navega al detalle
// 5. Botón "Crear ejercicio" abre el modal
```

**Archivo**: `apps/mobile/app/(app)/groups/[groupId]/exercises/__tests__/[exerciseId].test.tsx` (nuevo)

```typescript
// Escenarios a probar:
// 1. Muestra header con imagen cuando exercise.imageUrl existe
// 2. Muestra ranking completo con todos los miembros
// 3. Top 3 tiene estilos destacados (medallas)
// 4. Botones de disputa funcionan
```

## Resumen de cambios en tests

| Archivo | Cambio |
|---------|--------|
| `apps/api/src/modules/exercises/exercises.service.spec.ts` | Actualizar `mockExercise` con `imageUrl: null`. Agregar tests para `create` con/sin imageUrl. Agregar `describe('updateImage')` con 3 tests. |
| `apps/api/src/modules/exercises/exercises.resolver.spec.ts` | (Si existe) Agregar test para `updateExerciseImage`. |
| `apps/mobile/app/(app)/groups/[groupId]/__tests__/index.test.tsx` | (Nuevo) Tests del dashboard simplificado. |
| `apps/mobile/app/(app)/groups/[groupId]/exercises/__tests__/[exerciseId].test.tsx` | (Nuevo) Tests del detalle de ejercicio con imagen y ranking. |
