import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RelyingPartyService } from '../relying_party/relying_party.service';
import { CryptoService } from '../crypto/crypto.service';
import { AccessCertificateRegistrationDto } from '../relying_party/relying_party.dto';

@Injectable()
export class AccessCertService {
  constructor(
    private readonly relyingPartyService: RelyingPartyService,
    private readonly cryptoService: CryptoService,
  ) {}

  async register(dto: AccessCertificateRegistrationDto) {
    const rp = this.relyingPartyService.getById(dto.rpId);
    if (!rp) {
      throw new NotFoundException(
        `Relying party with id ${dto.rpId} not found`,
      );
    }

    const rpName = rp.legalName ?? rp.tradeName ?? 'Unknown';
    const orgIdentifier = this.relyingPartyService.getUniqueIdentifier(rp);

    let result: { serialNumber: string; certificate: string };
    try {
      result = await this.cryptoService.createCert(
        rpName,
        orgIdentifier,
        dto.publicKey,
        dto.dns,
      );
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    const entry = this.relyingPartyService.addAccessCertificate(dto.rpId, {
      id: result.serialNumber,
      certificate: result.certificate,
      dns: dto.dns,
    });

    return { id: entry.id, crt: entry.certificate };
  }

  getAll(rpId: string) {
    return this.relyingPartyService.getAccessCertificates(rpId);
  }

  findOne(rpId: string, certId: string) {
    const cert = this.relyingPartyService.findAccessCertificate(rpId, certId);
    if (!cert) {
      throw new NotFoundException(`Access certificate ${certId} not found`);
    }
    return { ...cert, crt: cert.certificate };
  }

  async revoke(rpId: string, certId: string) {
    const cert = this.relyingPartyService.findAccessCertificate(rpId, certId);
    if (!cert) {
      throw new NotFoundException(`Access certificate ${certId} not found`);
    }
    if (cert.revokedAt) {
      throw new BadRequestException('Certificate is already revoked');
    }

    // Revoke in OpenSSL CRL
    try {
      await this.cryptoService.revokeCert(cert.certificate);
    } catch {
      // CRL revocation may fail if cert wasn't signed by this CA — mark revoked anyway
    }

    return this.relyingPartyService.revokeAccessCertificate(rpId, certId);
  }
}
