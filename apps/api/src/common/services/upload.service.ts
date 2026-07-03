import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(private config: ConfigService) {}

  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    const uploadDir = this.config.get('UPLOAD_DIR', './uploads')
    const avatarDir = path.join(uploadDir, 'avatars')

    fs.mkdirSync(avatarDir, { recursive: true })

    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${crypto.randomUUID()}${ext}`
    const filePath = path.join(avatarDir, filename)

    fs.writeFileSync(filePath, file.buffer)

    this.logger.log(`Avatar saved: ${filePath}`)
    return `/uploads/avatars/${filename}`
  }
}
