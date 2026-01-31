import { Module } from '@nestjs/common';
import { RelyingPartyService } from './relying_party.service';
import { RelyingPartyController } from './relying_party.controller';
import { AuthModule } from '../auth/auth.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [AuthModule, CryptoModule],
  controllers: [RelyingPartyController],
  providers: [RelyingPartyService],
  exports: [RelyingPartyService],
})
export class RelyingPartyModule {}
