import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditService } from './audit.service'
import { UsersModule } from '../../modules/users/users.module'

@Global()
@Module({
  imports: [UsersModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class CommonServicesModule {}
