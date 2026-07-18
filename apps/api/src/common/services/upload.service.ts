import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(private config: ConfigService) {}

  private validate(file: Express.Multer.File) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de imagen no soportado. Usá JPG, PNG, WebP o GIF.',
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `La imagen es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). El máximo es ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB.`,
      )
    }
  }

  private saveFile(file: Express.Multer.File, subDir: string): string {
    const uploadDir = this.config.get('UPLOAD_DIR', './uploads')
    const dir = path.join(uploadDir, subDir)

    fs.mkdirSync(dir, { recursive: true })

    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${crypto.randomUUID()}${ext}`
    const filePath = path.join(dir, filename)

    fs.writeFileSync(filePath, file.buffer)

    this.logger.log(`File saved: ${filePath}`)
    return `/uploads/${subDir}/${filename}`
  }

  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    this.validate(file)
    return this.saveFile(file, 'avatars')
  }

  async uploadGroupAvatar(file: Express.Multer.File): Promise<string> {
    this.validate(file)
    return this.saveFile(file, 'groups')
  }

  async uploadExerciseImage(file: Express.Multer.File): Promise<string> {
    this.validate(file)
    return this.saveFile(file, 'exercises')
  }
}
