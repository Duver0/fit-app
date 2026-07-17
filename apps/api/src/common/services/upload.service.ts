import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(private config: ConfigService) {}

  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de imagen no soportado. Usá JPG, PNG, WebP o GIF.',
      )
    }

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

  async uploadGroupAvatar(file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de imagen no soportado. Usá JPG, PNG, WebP o GIF.',
      )
    }

    const uploadDir = this.config.get('UPLOAD_DIR', './uploads')
    const groupDir = path.join(uploadDir, 'groups')

    fs.mkdirSync(groupDir, { recursive: true })

    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${crypto.randomUUID()}${ext}`
    const filePath = path.join(groupDir, filename)

    fs.writeFileSync(filePath, file.buffer)

    this.logger.log(`Group avatar saved: ${filePath}`)
    return `/uploads/groups/${filename}`
  }
}
