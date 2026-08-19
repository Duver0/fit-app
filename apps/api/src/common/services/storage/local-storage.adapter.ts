import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { StorageAdapter } from './storage.adapter'

/**
 * Almacenamiento en disco local. Se usa en desarrollo y en despliegues con
 * sistema de archivos persistente (contenedores, VPS). NO sirve en Vercel
 * (FS de solo lectura).
 */
@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private config: ConfigService) {}

  private uploadDir(): string {
    return this.config.get('UPLOAD_DIR', './uploads')
  }

  private baseUrl(): string {
    const appUrl = this.config.get('APP_URL', 'http://localhost:4000')
    return appUrl.replace(/\/+$/, '') + '/uploads'
  }

  async upload(buffer: Buffer, key: string, _mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir(), key)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, buffer)
    return `${this.baseUrl()}/${key}`
  }

  async delete(url: string): Promise<void> {
    const match = url.match(/\/uploads\/(.+)$/)
    if (!match) return
    const filePath = path.join(this.uploadDir(), match[1])
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}
