import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common'
import * as path from 'node:path'
import * as crypto from 'node:crypto'
import { StorageAdapter } from './storage/storage.adapter'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export const STORAGE_ADAPTER = 'STORAGE_ADAPTER'

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  constructor(
    @Inject(STORAGE_ADAPTER) private storage: StorageAdapter,
  ) {}

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

  private async store(file: Express.Multer.File, subDir: string): Promise<string> {
    this.validate(file)
    const ext = path.extname(file.originalname) || '.jpg'
    const key = `${subDir}/${crypto.randomUUID()}${ext}`
    return this.storage.upload(file.buffer, key, file.mimetype)
  }

  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    return this.store(file, 'avatars')
  }

  async uploadGroupAvatar(file: Express.Multer.File): Promise<string> {
    return this.store(file, 'groups')
  }

  async uploadExerciseImage(file: Express.Multer.File): Promise<string> {
    return this.store(file, 'exercises')
  }

  /**
   * Elimina un archivo dada su URL pública, sin importar si es local o S3/R2.
   * Es seguro llamarlo aunque la URL sea nula o el archivo no exista.
   */
  deleteFileByUrl(fileUrl: string | null | undefined): void {
    if (!fileUrl) return
    // El adaptador hace el parseo de la URL a la key correspondiente.
    void this.storage.delete(fileUrl).catch((e) => {
      this.logger.warn(
        `Could not delete file ${fileUrl}: ${e instanceof Error ? e.message : e}`,
      )
    })
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
