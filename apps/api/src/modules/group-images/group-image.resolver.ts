import { Resolver, Query, Args, Int } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard'
import { GroupImage } from '../../common/models'
import { GroupImageService } from './group-image.service'

@Resolver()
@UseGuards(GqlAuthGuard)
export class GroupImageResolver {
  constructor(private readonly groupImageService: GroupImageService) {}

  @Query(() => [GroupImage], { description: 'Obtiene imágenes para una categoría de grupo muscular (Chest, Back, etc.)' })
  async groupImages(
    @Args('category') category: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<GroupImage[]> {
    const images = await this.groupImageService.getImagesForCategory(category)
    return limit ? images.slice(0, limit) : images
  }

  @Query(() => [GroupImage], { description: 'Fuerza la renovación del caché de imágenes para una categoría' })
  async refreshGroupImages(
    @Args('category') category: string,
  ): Promise<GroupImage[]> {
    return this.groupImageService.refreshCache(category)
  }

  @Query(() => [GroupImage], { description: 'Busca imágenes de stock por texto (ej: "running", "yoga") en Unsplash/Pexels/Pixabay. Sin caché — consulta en vivo.' })
  async searchGroupImages(
    @Args('query') query: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<GroupImage[]> {
    return this.groupImageService.searchImages(query, limit ?? 8)
  }

  @Query(() => [String], { description: 'Diagnóstico: lista los proveedores de imágenes activos (unsplash, pexels, pixabay). Vacío si no hay ninguno configurado.' })
  async activeImageProviders(): Promise<string[]> {
    return this.groupImageService.getActiveProviders()
  }
}
