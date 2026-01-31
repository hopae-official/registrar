import { Injectable } from '@nestjs/common';
import { RelyingPartyService } from '../relying_party/relying_party.service';

@Injectable()
export class RegistrationCertService {
  constructor(private readonly relyingPartyService: RelyingPartyService) {}

  getAll(rpId: string) {
    return this.relyingPartyService.getRegistrationCertificates(rpId);
  }

  add(rpId: string, certificate: string, intendedUseIdentifier: string) {
    return this.relyingPartyService.addRegistrationCertificate(rpId, {
      certificate,
      intendedUseIdentifier,
    });
  }

  revoke(rpId: string, certIndex: number) {
    return this.relyingPartyService.revokeRegistrationCertificate(
      rpId,
      certIndex,
    );
  }
}
