import { Global, Module } from '@nestjs/common'
import { AuditService } from './audit.service'
import { UploadService } from './upload.service'

@Global()
@Module({
  providers: [AuditService, UploadService],
  exports: [AuditService, UploadService],
})
export class CommonServicesModule {}
