import { Global, Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { AuditService } from './audit.service'
import { UploadService } from './upload.service'
import { UploadController } from '../controllers/upload.controller'
import { UsersModule } from '../../modules/users/users.module'

@Global()
@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 20 * 1024 * 1024 } }),
    UsersModule,
  ],
  controllers: [UploadController],
  providers: [AuditService, UploadService],
  exports: [AuditService, UploadService],
})
export class CommonServicesModule {}
