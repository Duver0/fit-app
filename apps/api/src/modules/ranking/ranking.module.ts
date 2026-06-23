import { Module } from '@nestjs/common'
import { RankingResolver } from './ranking.resolver'
import { RankingService } from './ranking.service'

@Module({
  providers: [RankingResolver, RankingService],
  exports: [RankingService],
})
export class RankingModule {}
