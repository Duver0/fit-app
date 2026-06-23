import { Module } from '@nestjs/common'
import { InvitationsResolver } from './invitations.resolver'
import { InvitationsService } from './invitations.service'

@Module({
  providers: [InvitationsResolver, InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
