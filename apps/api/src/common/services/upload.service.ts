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

    // Construir URL absoluta para que funcione en cualquier cliente
    const appUrl = this.config.get('APP_URL', 'http://localhost:4000')
    const baseUrl = appUrl.replace(/\/+$/, '')
    return `${baseUrl}/uploads/${subDir}/${filename}`
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

  /**
   * Elimina un archivo del disco dada su URL pública.
   * Es seguro llamarlo aunque la URL sea nula o el archivo no exista.
   */
  deleteFileByUrl(fileUrl: string | null | undefined): void {
    if (!fileUrl) return

    try {
      const uploadDir = this.config.get('UPLOAD_DIR', './uploads')
      // La URL es algo como "http://localhost:4000/uploads/exercises/uuid.jpg"
      // Extraemos la parte después de /uploads/
      const parts = fileUrl.split('/uploads/')
      if (parts.length < 2) return

      const relativePath = parts[1]
      const filePath = path.join(uploadDir, relativePath)

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        this.logger.log(`Deleted file: ${filePath}`)
      }
    } catch (e) {
      this.logger.warn(`Could not delete file ${fileUrl}: ${e instanceof Error ? e.message : e}`)
    }
  }

  /**
   * Elimina múltiples archivos por sus URLs.
   */
  deleteFilesByUrls(urls: (string | null | undefined)[]): void {
    for (const url of urls) {
      this.deleteFileByUrl(url)
    }
  }
}
