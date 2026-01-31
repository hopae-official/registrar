import { Injectable } from '@nestjs/common';
import { RelyingPartyService } from '../relying_party/relying_party.service';

@Injectable()
export class AccessCertService {
  constructor(private readonly relyingPartyService: RelyingPartyService) {}

  getAll(rpId: string) {
    return this.relyingPartyService.getAccessCertificates(rpId);
  }

  add(rpId: string, certificate: string) {
    return this.relyingPartyService.addAccessCertificate(rpId, { certificate });
  }

  revoke(rpId: string, certIndex: number) {
    return this.relyingPartyService.revokeAccessCertificate(rpId, certIndex);
  }
}
