# Spec Técnica: Feature Rutina (Routine)

## 1. Modelo de Datos (Prisma)

### Modificaciones al modelo User
```prisma
model User {
  // ... campos existentes ...
  routineEnabled Boolean  @default(false) @map("routine_enabled")
  routineDays    RoutineDay[]
  
  // @@map("users") - mismo nombre de tabla
}
```

### Nuevos modelos

```prisma
model RoutineDay {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  dayOfWeek Int      @map("day_of_week")        // 0=Lunes, 1=Martes, ... 6=Domingo
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercises RoutineExercise[]

  @@unique([userId, dayOfWeek])
  @@index([userId])
  @@map("routine_days")
}

model RoutineExercise {
  id         String   @id @default(uuid()) @db.Uuid
  dayId      String   @map("day_id") @db.Uuid
  exerciseId String   @map("exercise_id") @db.Uuid
  sortOrder  Int      @map("sort_order")     // 0-based, para ordenamiento
  createdAt  DateTime @default(now()) @map("created_at")

  day      RoutineDay @relation(fields: [dayId], references: [id], onDelete: Cascade)
  exercise Exercise   @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@unique([dayId, exerciseId])
  @@index([dayId, sortOrder])
  @@map("routine_exercises")
}
```

## 2. API GraphQL (Backend)

### Módulo `routines` en `apps/api/src/modules/routines/`

Estructura:
```
routines/
  dto/
    routine.input.ts       -> AddExerciseInput, ReorderInput
  routines.module.ts
  routines.resolver.ts
  routines.service.ts
  routines.service.spec.ts
```

### Nuevos ObjectTypes

```typescript
// En common/models/routine.model.ts
@ObjectType()
export class RoutineDay {
  @Field(() => ID)
  id: string
  
  @Field(() => Int)
  dayOfWeek: number  // 0=Lunes .. 6=Domingo
  
  @Field(() => [RoutineExercise])
  exercises: RoutineExercise[]
}

@ObjectType()
export class RoutineExercise {
  @Field(() => ID)
  id: string
  
  @Field(() => Exercise)
  exercise: Exercise
  
  @Field(() => Int)
  sortOrder: number
  
  @Field(() => PerformanceRecord, { nullable: true })
  myPerformance?: PerformanceRecord  // La marca del usuario actual para este ejercicio
}
```

### Nuevas Queries

```graphql
type Query {
  myRoutineDays: [RoutineDay!]!
  routineDay(dayOfWeek: Int!): RoutineDay
}
```

### Nuevas Mutations

```graphql
type Mutation {
  toggleRoutine(enabled: Boolean!): User!
  addExerciseToDay(dayOfWeek: Int!, exerciseId: String!): RoutineDay!
  removeExerciseFromDay(dayOfWeek: Int!, exerciseId: String!): RoutineDay!
  reorderExercises(dayOfWeek: Int!, exerciseIds: [String!]!): RoutineDay!
}
```

### Lógica de negocio (RoutinesService)

- `toggleRoutine(userId, enabled)` -> update User.routineEnabled
- `getRoutineDays(userId)` -> findMany RoutineDay where userId, include exercises with exercise + my performance
- `getRoutineDay(userId, dayOfWeek)` -> findUnique RoutineDay or create if not exists, include exercises ordered by sortOrder
- `addExerciseToDay(userId, dayOfWeek, exerciseId)`:
  1. Verify user is member of the exercise's group
  2. Verify user has a performance for this exercise
  3. Get or create RoutineDay
  4. Check exercise not already in day
  5. Get max sortOrder + 1
  6. Create RoutineExercise
- `removeExerciseFromDay(userId, dayOfWeek, exerciseId)` -> delete the RoutineExercise
- `reorderExercises(userId, dayOfWeek, exerciseIds)` -> update sortOrder for each RoutineExercise based on array index

## 3. Frontend Mobile

### Nuevas rutas (Expo Router)

```
app/(app)/routine/
  _layout.tsx       -> Stack navigator
  index.tsx         -> Vista de días de la semana
  [day].tsx         -> Ejercicios de un día específico
```

### Modificaciones a archivos existentes

#### `app/(app)/_layout.tsx`
- Importar `useAuthStore` para leer `user.routineEnabled`
- Agregar `Tabs.Screen` condicional para "Rutina" cuando `user?.routineEnabled === true`
- Ocultar con `tabBarButton: () => <View style={{ display: 'none' }} />` cuando esté deshabilitado

#### `app/(app)/profile.tsx`
- Agregar toggle "Mostrar pestaña Rutina" similar al toggle de modo oscuro
- Usar mutation `toggleRoutine` y actualizar el store local

#### `src/lib/graphql.ts`
- Agregar TOGGLE_ROUTINE_MUTATION
- Agregar MY_ROUTINE_DAYS_QUERY
- Agregar ROUTINE_DAY_QUERY
- Agregar ADD_EXERCISE_TO_DAY_MUTATION
- Agregar REMOVE_EXERCISE_FROM_DAY_MUTATION
- Agregar REORDER_EXERCISES_MUTATION

#### `src/stores/authStore.ts`
- Agregar `routineEnabled: boolean` a la interfaz User (viene del backend en `me` query)
- Al hacer login/register ya viene el user; actualizar el tipo

### Componentes UI necesarios

#### `src/components/ui/DaySelector.tsx`
- Grid de 7 días (Lun-Dom)
- Cada día muestra: nombre del día, indicador visual de si tiene ejercicios
- Al presionar, navega a `/(app)/routine/[dayOfWeek]`

#### `src/components/routine/RoutineExerciseCard.tsx`
- Muestra: nombre del ejercicio, grupo de origen, unidad, marca actual
- Botón para editar marca (abre modal similar al de exercise detail)
- Botón para eliminar de la rutina
- Handle para drag & drop (opcional, se puede usar orden con botones arriba/abajo)

### States de carga/vacío/error

- `myRoutineDays`: loading con Skeleton, empty state "No tienes ejercicios en tu rutina. Agrega desde un día."
- `routineDay`: loading, empty state "Este día no tiene ejercicios. Agrega tu primer ejercicio."
- Errores: usar showErrorToast estándar

## 4. Tests

### Backend (RoutinesService)
- `toggleRoutine` should enable/disable routine
- `getRoutineDays` should return only user's days
- `addExerciseToDay` should create day if not exists
- `addExerciseToDay` should forbid non-member exercises
- `addExerciseToDay` should forbid exercises without user performance
- `removeExerciseFromDay` should remove exercise
- `reorderExercises` should update sort order

### E2E básico
- Flujo completo: toggle -> add exercise -> reorder -> remove

## 5. Migración

```bash
npx prisma migrate dev --name add_routine_feature
```

La migración debe:
1. Agregar columna `routine_enabled` a `users` (boolean, default false)
2. Crear tabla `routine_days`
3. Crear tabla `routine_exercises`
4. Generar índices

## 6. Seguridad

- Todas las rutinas son privadas del usuario (solo él ve/edita)
- Verificar membresía del grupo antes de agregar ejercicio
- Verificar que el usuario tenga una performance para ese ejercicio
- Usar GqlAuthGuard en todas las queries/mutations
