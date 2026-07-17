import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, UseFilters, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { GqlAuthGuard } from '../../modules/auth/guards/gql-auth.guard'
import { UsersService } from '../../modules/users/users.service'
import { UploadService } from '../services/upload.service'
import { CurrentUser } from '../decorators/current-user.decorator'
import { MulterExceptionFilter } from '../filters/multer-exception.filter'

@Controller('upload')
@UseGuards(GqlAuthGuard)
@UseFilters(MulterExceptionFilter)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.')
    }

    const avatarUrl = await this.uploadService.uploadAvatar(file)
    await this.usersService.updateProfile(user.id, { avatarUrl })
    return { avatarUrl }
  }

  @Post('group')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGroupAvatar(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.')
    }

    const avatarUrl = await this.uploadService.uploadGroupAvatar(file)
    return { avatarUrl }
  }
}
