import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(private config: ConfigService) {}

  async uploadAvatar(file: any, folder: string): Promise<string> {
    this.logger.warn('R2 upload not yet implemented, returning placeholder URL')
    return `https://via.placeholder.com/256?text=${folder}`
  }
}
