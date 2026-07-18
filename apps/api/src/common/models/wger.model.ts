import { ObjectType, Field, Int } from '@nestjs/graphql'

@ObjectType({ description: 'Imagen de un ejercicio desde wger' })
export class WgerImage {
  @Field()
  image: string

  @Field({ nullable: true })
  thumbnailSmall?: string

  @Field({ nullable: true })
  thumbnailMedium?: string
}

@ObjectType({ description: 'Ejercicio obtenido desde wger.de API' })
export class WgerExercise {
  @Field(() => Int)
  id: number

  @Field()
  name: string

  @Field({ nullable: true })
  category?: string

  @Field({ nullable: true, description: 'URL de la imagen principal del ejercicio' })
  image?: string

  @Field({ nullable: true, description: 'URL del thumbnail mediano' })
  thumbnail?: string

  @Field(() => [String], { nullable: true })
  muscles?: string[]

  @Field(() => [String], { nullable: true })
  equipment?: string[]

  @Field({ nullable: true })
  description?: string
}

@ObjectType({ description: 'Resultado paginado de búsqueda en wger' })
export class WgerSearchResult {
  @Field(() => [WgerExercise])
  items: WgerExercise[]

  @Field()
  total: number

  @Field({ nullable: true })
  nextOffset?: number

  @Field()
  hasNextPage: boolean
}
