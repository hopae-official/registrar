import { Module } from '@nestjs/common';
import { RelyingPartyService } from './relying_party.service';
import { IntermediaryService } from './intermediary.service';
import { AccessCertService } from '../access_cert/access_cert.service';
import { RegistrationCertService } from '../registration_cert/registration_cert.service';
import { AuthModule } from '../auth/auth.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PublicRegistryController } from './controllers/public-registry.controller';
import { WrpPortalController } from './controllers/wrp-portal.controller';
import { IntermediaryPortalController } from './controllers/intermediary-portal.controller';
import { IntermediaryApiController } from './controllers/intermediary-api.controller';

@Module({
  imports: [AuthModule, CryptoModule],
  controllers: [
    PublicRegistryController,
    WrpPortalController,
    IntermediaryPortalController,
    IntermediaryApiController,
  ],
  providers: [
    RelyingPartyService,
    AccessCertService,
    RegistrationCertService,
    IntermediaryService,
  ],
  exports: [RelyingPartyService],
})
export class RelyingPartyModule {}
