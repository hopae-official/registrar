import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RelyingPartyService } from '../relying_party/relying_party.service';
import { CryptoService } from '../crypto/crypto.service';
import {
  AccessCertificateRegistrationDto,
  WRPAC_POLICY_OIDS,
} from '../relying_party/relying_party.dto';

@Injectable()
export class AccessCertService {
  constructor(
    private readonly relyingPartyService: RelyingPartyService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: AccessCertificateRegistrationDto) {
    const rp = await this.relyingPartyService.getById(dto.rpId);
    if (!rp) {
      throw new NotFoundException(
        `Relying party with id ${dto.rpId} not found`,
      );
    }

    // WRPAC subject per ETSI TS 119 475 Table 1 (legal person): commonName = tradeName (falling back
    // to legalName per GEN-5.1.2-02), organizationName = legalName, organizationIdentifier = the
    // registered semantic identifier that also appears as the WRPRC `sub` (GEN-5.1.1-02 linkability).
    // Non-qualified certificate policy (ETSI TS 119 411-8 clause 5.3): NCP-l for a legal person
    // (e-seal), NCP-n for a natural person (e-signature).
    const isNatural = !!(rp.givenName || rp.familyName);
    const subject = {
      commonName: rp.tradeName ?? rp.legalName ?? 'Unknown',
      organizationName: rp.legalName ?? rp.tradeName ?? 'Unknown',
      organizationIdentifier: this.relyingPartyService.getUniqueIdentifier(rp),
      country: this.configService.get<string>('WRP_COUNTRY', 'LU'),
      email: rp.email,
      phone: rp.phone,
      supportURI: rp.supportURI?.[0],
      policyOid: isNatural
        ? WRPAC_POLICY_OIDS.NCP_NATURAL
        : WRPAC_POLICY_OIDS.NCP_LEGAL,
    };

    let result: { serialNumber: string; certificate: string };
    try {
      result = await this.cryptoService.createCert(
        subject,
        dto.publicKey,
        dto.dns,
      );
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    const entry = await this.relyingPartyService.addAccessCertificate(
      dto.rpId,
      {
        id: result.serialNumber,
        certificate: result.certificate,
        dns: dto.dns,
      },
    );

    return { id: entry.id, crt: entry.certificate };
  }

  getAll(rpId: string) {
    return this.relyingPartyService.getAccessCertificates(rpId);
  }

  async findOne(rpId: string, certId: string) {
    const cert = await this.relyingPartyService.findAccessCertificate(
      rpId,
      certId,
    );
    if (!cert) {
      throw new NotFoundException(`Access certificate ${certId} not found`);
    }
    return { ...cert, crt: cert.certificate };
  }

  async revoke(rpId: string, certId: string) {
    const cert = await this.relyingPartyService.findAccessCertificate(
      rpId,
      certId,
    );
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
