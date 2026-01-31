import { Module } from '@nestjs/common';
import { AccessCertController } from './access_cert.controller';
import { AccessCertService } from './access_cert.service';
import { RelyingPartyModule } from '../relying_party/relying_party.module';
import { AuthModule } from '../auth/auth.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [RelyingPartyModule, AuthModule, CryptoModule],
  controllers: [AccessCertController],
  providers: [AccessCertService],
  exports: [AccessCertService],
})
export class AccessCertModule {}
