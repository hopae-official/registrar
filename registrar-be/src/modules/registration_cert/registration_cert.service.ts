import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RelyingPartyService } from '../relying_party/relying_party.service';
import { CryptoService } from '../crypto/crypto.service';
import { RegistrationCertificateCreationDto } from '../relying_party/relying_party.dto';

@Injectable()
export class RegistrationCertService {
  constructor(
    private readonly relyingPartyService: RelyingPartyService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: RegistrationCertificateCreationDto) {
    const rp = this.relyingPartyService.getById(dto.rpId);
    if (!rp) {
      throw new NotFoundException(
        `Relying party with id ${dto.rpId} not found`,
      );
    }

    // ETSI TS 119 475 Table 7 NOTE 4: WRPRCs are not issued for WRPs
    // registered solely for the purpose of acting as an intermediary.
    // WRPRC subject is always the final RP, never the intermediary itself.
    if (rp.isIntermediary) {
      throw new BadRequestException(
        'Registration certificates cannot be issued for WRPs registered as an intermediary. ' +
          'Issue the WRPRC under the mediated Relying Party instead.',
      );
    }

    const distinguishedName = this.relyingPartyService.getUniqueIdentifier(rp);
    const jti = randomUUID();
    const host = this.configService.get<string>(
      'HOST',
      'http://localhost:18000',
    );

    // Build WRP JWT payload per TS5 spec / reference implementation
    const payload: Record<string, unknown> = {
      iss: this.cryptoService.issuer,
      sub: distinguishedName,
      jti,
      iat: Math.floor(Date.now() / 1000),
      name: rp.tradeName ?? rp.legalName ?? '',
      legal_name: rp.legalName ?? '',
      country: 'LU',
      registry_uri: host + rp.registryURI,
      srvDescription: rp.srvDescription,
      entitlements: rp.entitlement,
      isPSB: rp.isPSB,
      support_uri: dto.support_uri,
      privacy_policy: dto.privacy_policy,
      purpose: dto.purpose,
      credentials: dto.credentials,
      provided_attestations: dto.provided_attestations,
      dpa: {
        email: rp.supervisoryAuthority?.email ?? '',
        phone: rp.supervisoryAuthority?.phone ?? '',
        uri: rp.supervisoryAuthority?.infoURI?.[0] ?? '',
      },
      policy_id: '',
      certificate_policy: '',
      info_uri: rp.infoURI?.[0] ?? host,
    };

    // Handle intermediary reference (ETSI TS 119 475, Table 10)
    if (dto.intermediary) {
      const intermediary = this.relyingPartyService.getById(dto.intermediary);
      if (!intermediary) {
        throw new NotFoundException(
          `Intermediary with id ${dto.intermediary} not found`,
        );
      }
      payload.intermediary = {
        sub: this.relyingPartyService.getUniqueIdentifier(intermediary),
        sname: intermediary.tradeName ?? intermediary.legalName ?? '',
      };
    }

    // Sign as JWT (ES256 with x5c chain)
    const jwt = await this.cryptoService.signJWT(payload, {
      typ: 'rc-wrp+jwt',
    });

    // Store in RP object
    const entry = this.relyingPartyService.addRegistrationCertificate(
      dto.rpId,
      {
        id: jti,
        jwt,
        intendedUse: { purpose: dto.purpose ?? [] },
      },
    );

    return { id: entry.id, jwt: entry.jwt, intendedUse: entry.intendedUse };
  }

  getAll(rpId: string) {
    return this.relyingPartyService.getRegistrationCertificates(rpId);
  }

  findOne(rpId: string, certId: string) {
    const certs = this.relyingPartyService.getRegistrationCertificates(rpId);
    const cert = certs.find((c) => c.id === certId);
    if (!cert) {
      throw new NotFoundException(
        `Registration certificate ${certId} not found`,
      );
    }
    return cert;
  }

  revoke(rpId: string, certId: string) {
    const cert = this.findOne(rpId, certId);
    if (cert.revokedAt) {
      throw new BadRequestException('Certificate is already revoked');
    }
    return this.relyingPartyService.revokeRegistrationCertificate(rpId, certId);
  }
}
