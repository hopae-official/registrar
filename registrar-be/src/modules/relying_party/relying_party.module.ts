import { Module } from '@nestjs/common';
import { RelyingPartyService } from './relying_party.service';
import { RelyingPartyController } from './relying_party.controller';

@Module({
  imports: [],
  controllers: [RelyingPartyController],
  providers: [RelyingPartyService],
  exports: [RelyingPartyService],
})
export class RelyingPartyModule {}
