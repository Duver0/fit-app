import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { GqlAuthGuard } from '../../modules/auth/guards/gql-auth.guard'
import { UsersService } from '../../modules/users/users.service'
import { UploadService } from '../services/upload.service'
import { CurrentUser } from '../decorators/current-user.decorator'

@Controller('upload')
@UseGuards(GqlAuthGuard)
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
    const avatarUrl = await this.uploadService.uploadAvatar(file)
    await this.usersService.updateProfile(user.id, { avatarUrl })
    return { avatarUrl }
  }
}
