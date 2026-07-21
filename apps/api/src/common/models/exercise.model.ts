import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql'
import { ExerciseUnit } from '@prisma/client'
import { User } from './user.model'
import { ExerciseCategory } from './exercise-category.model'

export { ExerciseUnit }

registerEnumType(ExerciseUnit, { name: 'ExerciseUnit' })

@ObjectType()
export class Exercise {
  @Field(() => ID)
  id: string

  @Field()
  groupId: string

  @Field({ nullable: true })
  categoryId?: string

  @Field(() => ExerciseCategory, { nullable: true })
  category?: ExerciseCategory

  @Field()
  name: string

  @Field(() => ExerciseUnit)
  unit: ExerciseUnit

  @Field({ nullable: true })
  imageUrl?: string

  // --- Datos enriquecidos desde wger.de ---

  @Field(() => Int, { nullable: true, description: 'ID del ejercicio en wger.de' })
  wgerId?: number

  @Field({ nullable: true, description: 'Categoría del ejercicio (Chest, Legs, etc.)' })
  wgerCategory?: string

  @Field(() => [String], { nullable: true, description: 'Músculos trabajados' })
  wgerMuscles?: string[]

  @Field(() => [String], { nullable: true, description: 'Equipamiento necesario' })
  wgerEquipment?: string[]

  @Field({ nullable: true, description: 'Instrucciones paso a paso desde wger' })
  wgerInstructions?: string

  // ---

  @Field(() => User, { name: 'createdBy', description: 'User who created the exercise (resolved from Prisma creator relation)' })
  creator: User

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
