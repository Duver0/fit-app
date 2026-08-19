import { Global, Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { ConfigService } from '@nestjs/config'
import { AuditService } from './audit.service'
import { UploadService, STORAGE_ADAPTER } from './upload.service'
import { LocalStorageAdapter } from './storage/local-storage.adapter'
import { S3StorageAdapter } from './storage/s3-storage.adapter'
import { UploadController } from '../controllers/upload.controller'
import { UsersModule } from '../../modules/users/users.module'

@Global()
@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
    UsersModule,
  ],
  controllers: [UploadController],
  providers: [
    AuditService,
    UploadService,
    LocalStorageAdapter,
    S3StorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (
        config: ConfigService,
        local: LocalStorageAdapter,
        s3: S3StorageAdapter,
      ) => (config.get('STORAGE_DRIVER') === 's3' ? s3 : local),
      inject: [ConfigService, LocalStorageAdapter, S3StorageAdapter],
    },
  ],
  exports: [AuditService, UploadService],
})
export class CommonServicesModule {}
