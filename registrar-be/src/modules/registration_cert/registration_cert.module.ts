import { Module } from '@nestjs/common';
import { RegistrationCertController } from './registration_cert.controller';
import { RegistrationCertService } from './registration_cert.service';
import { RelyingPartyModule } from '../relying_party/relying_party.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RelyingPartyModule, AuthModule],
  controllers: [RegistrationCertController],
  providers: [RegistrationCertService],
  exports: [RegistrationCertService],
})
export class RegistrationCertModule {}
