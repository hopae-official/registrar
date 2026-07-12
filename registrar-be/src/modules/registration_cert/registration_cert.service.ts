import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { RelyingPartyService } from '../relying_party/relying_party.service';
import { CryptoService } from '../crypto/crypto.service';
import {
  RegistrationCertificateCreationDto,
  MultiLangString,
  ENTITLEMENT_URIS,
  WRPRC_POLICY_OID,
} from '../relying_party/relying_party.dto';

@Injectable()
export class RegistrationCertService {
  constructor(
    private readonly relyingPartyService: RelyingPartyService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: RegistrationCertificateCreationDto) {
    const rp = await this.relyingPartyService.getById(dto.rpId);
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

    const sub = this.relyingPartyService.getUniqueIdentifier(rp);
    const jti = randomUUID();
    const host = this.configService.get<string>(
      'HOST',
      'http://localhost:18000',
    );
    const country = this.configService.get<string>('WRP_COUNTRY', 'LU');

    // GEN-5.2.4-03: the WRPRC shall carry at least one EU-level entitlement (clause A.2).
    const knownEntitlements = new Set<string>(Object.values(ENTITLEMENT_URIS));
    const entitlements = rp.entitlement ?? [];
    if (!entitlements.some((e) => knownEntitlements.has(e))) {
      throw new BadRequestException(
        'WRPRC requires at least one EU-level entitlement (ETSI TS 119 475 clause A.2, GEN-5.2.4-03)',
      );
    }

    // B.2.6 MultiLangString → {lang, value} as used throughout the WRPRC payload.
    const toLangValue = (m: MultiLangString) => ({
      lang: m.lang,
      value: m.content,
    });

    // WRPRC payload per ETSI TS 119 475 clause 5.2.4 (Tables 7-10) — see Annex C for a decoded example.
    const payload: Record<string, unknown> = {
      // Table 7 — attributes provided by the registry
      name: rp.tradeName ?? rp.legalName ?? '',
      ...(rp.legalName ? { sub_ln: rp.legalName } : {}),
      ...(rp.givenName ? { sub_gn: rp.givenName } : {}),
      ...(rp.familyName ? { sub_fn: rp.familyName } : {}),
      sub,
      country,
      registry_uri: host + rp.registryURI,
      srv_description: [(rp.srvDescription ?? []).map(toLangValue)],
      entitlements,
      privacy_policy: dto.privacy_policy,
      info_uri: rp.infoURI?.[0] ?? host,
      support_uri: dto.support_uri ?? rp.supportURI?.[0] ?? '',
      supervisory_authority: {
        email: rp.supervisoryAuthority?.email ?? '',
        phone: rp.supervisoryAuthority?.phone ?? '',
        uri: rp.supervisoryAuthority?.infoURI?.[0] ?? '',
      },
      policy_id: [WRPRC_POLICY_OID],
      certificate_policy: `${host}/certificate-policy`,
      iat: Math.floor(Date.now() / 1000),
      // Table 10 — optional
      public_body: rp.isPSB ?? false,
    };

    // Table 9 — service provider (data-request scope)
    if (dto.purpose?.length) payload.purpose = dto.purpose.map(toLangValue);
    if (dto.credentials?.length) payload.credentials = dto.credentials;

    // Table 8 — attestation provider (issued to PID/QEAA/Non-Q/PUB EAA providers)
    const attestations = dto.provided_attestations ?? rp.providesAttestations;
    if (attestations?.length) payload.provides_attestations = attestations;

    // Intermediary reference (Table 10) + actor claim (GEN-5.2.4-09).
    if (dto.intermediary) {
      const intermediary = await this.relyingPartyService.getById(
        dto.intermediary,
      );
      if (!intermediary) {
        throw new NotFoundException(
          `Intermediary with id ${dto.intermediary} not found`,
        );
      }
      const intSub = this.relyingPartyService.getUniqueIdentifier(intermediary);
      payload.intermediary = {
        sub: intSub,
        sname: intermediary.tradeName ?? intermediary.legalName ?? '',
      };
      payload.act = { sub: intSub };
    }

    // GEN-5.2.1-04: sign as a JAdES baseline (B-B) signature with typ = rc-wrp+jwt.
    const jwt = this.cryptoService.signJAdES(payload, 'rc-wrp+jwt');

    // Store in RP object
    const entry = await this.relyingPartyService.addRegistrationCertificate(
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

  async findOne(rpId: string, certId: string) {
    const certs =
      await this.relyingPartyService.getRegistrationCertificates(rpId);
    const cert = certs.find((c) => c.id === certId);
    if (!cert) {
      throw new NotFoundException(
        `Registration certificate ${certId} not found`,
      );
    }
    return cert;
  }

  async revoke(rpId: string, certId: string) {
    const cert = await this.findOne(rpId, certId);
    if (cert.revokedAt) {
      throw new BadRequestException('Certificate is already revoked');
    }
    return this.relyingPartyService.revokeRegistrationCertificate(rpId, certId);
  }
}
