import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { StorageAdapter } from './storage.adapter'

/**
 * Almacenamiento en cualquier bucket compatible con la API S3 (Cloudflare R2,
 * AWS S3, MinIO, Supabase Storage, etc.). Es el requerido para entornos
 * serverless como Vercel donde el FS es de solo lectura.
 *
 * Variables de entorno necesarias cuando STORAGE_DRIVER=s3:
 *   S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 * Opcionales:
 *   S3_ENDPOINT, S3_REGION (default 'auto'), S3_ACCOUNT_ID, S3_PUBLIC_URL
 */
@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(S3StorageAdapter.name)
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET')!
    const accountId = this.config.get<string>('S3_ACCOUNT_ID')
    const configuredPublicUrl = this.config.get<string>('S3_PUBLIC_URL')

    const defaultPublicUrl = accountId
      ? `https://${accountId}.r2.cloudflarestorage.com/${this.bucket}`
      : ''

    this.publicUrl = (configuredPublicUrl || defaultPublicUrl).replace(/\/+$/, '')

    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION') || 'auto',
      endpoint: this.config.get<string>('S3_ENDPOINT') || undefined,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY')!,
      },
    })
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    )
    this.logger.log(`Uploaded to S3/R2: ${key}`)
    return `${this.publicUrl}/${key}`
  }

  async delete(url: string): Promise<void> {
    // La key es siempre los dos últimos segmentos de la ruta (subDir/archivo).
    const match = url.match(/\/([^/]+\/[^/]+)$/)
    if (!match) return
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: match[1] }),
    )
  }
}
