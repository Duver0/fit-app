import { Module } from '@nestjs/common'
import { GroupImageService } from './group-image.service'
import { GroupImageResolver } from './group-image.resolver'

@Module({
  providers: [GroupImageService, GroupImageResolver],
  exports: [GroupImageService],
})
export class GroupImagesModule {}
