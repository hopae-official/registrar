import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  WalletRelyingParty,
  CreateRelyingPartyDto,
  UpdateRelyingPartyDto,
  SearchRelyingPartyQueryDto,
  CheckIntendedUseQueryDto,
  AccessCertificateEntry,
  RegistrationCertificateEntry,
  IntendedUse,
} from './relying_party.dto';

@Injectable()
export class RelyingPartyService {
  private relyingParties: WalletRelyingParty[] = [];

  private toPublicResponse(rp: WalletRelyingParty) {
    // Per TS5 spec: exclude physicalAddress from public responses
    const { postalAddress, ownerId, ...publicData } = rp;
    return publicData;
  }

  getById(id: string): WalletRelyingParty | undefined {
    return this.relyingParties.find((rp) => rp.id === id);
  }

  getUniqueIdentifier(rp: WalletRelyingParty): string {
    return rp.id;
  }

  findAll(query: SearchRelyingPartyQueryDto) {
    let results = [...this.relyingParties];

    if (query.identifier) {
      results = results.filter((rp) =>
        rp.identifier.some((id) => id.value === query.identifier),
      );
    }

    if (query.legalname) {
      const search = query.legalname.toLowerCase();
      results = results.filter(
        (rp) =>
          rp.legalName?.toLowerCase().includes(search) ||
          rp.tradeName?.toLowerCase().includes(search),
      );
    }

    if (query.tradename) {
      const search = query.tradename.toLowerCase();
      results = results.filter((rp) =>
        rp.tradeName?.toLowerCase().includes(search),
      );
    }

    if (query.policy) {
      results = results.filter((rp) =>
        rp.intendedUse?.some((iu) =>
          iu.privacyPolicy.some((p) => p.uri === query.policy),
        ),
      );
    }

    if (query.entitlement) {
      results = results.filter((rp) =>
        rp.entitlement.includes(query.entitlement!),
      );
    }

    if (query.providesattestation) {
      results = results.filter((rp) =>
        rp.providesAttestations?.some(
          (c) => c.meta === query.providesattestation,
        ),
      );
    }

    if (query.usesintermediary !== undefined) {
      const uses = query.usesintermediary === 'true';
      if (uses) {
        results = results.filter(
          (rp) => rp.usesIntermediary && rp.usesIntermediary.length > 0,
        );
      } else {
        results = results.filter(
          (rp) => !rp.usesIntermediary || rp.usesIntermediary.length === 0,
        );
      }
    }

    if (query.isintermediary !== undefined) {
      const isIntermediary = query.isintermediary === 'true';
      results = results.filter((rp) => rp.isIntermediary === isIntermediary);
    }

    if (query.intendeduseidentifier) {
      results = results.filter((rp) =>
        rp.intendedUse?.some(
          (iu) => iu.intendedUseIdentifier === query.intendeduseidentifier,
        ),
      );
    }

    if (query.intendedUseClaimPath) {
      results = results.filter((rp) =>
        rp.intendedUse?.some((iu) =>
          iu.credential.some((c) =>
            c.claim?.some((cl) =>
              cl.path.includes(query.intendedUseClaimPath!),
            ),
          ),
        ),
      );
    }

    if (query.intendedUseCredentialMeta) {
      results = results.filter((rp) =>
        rp.intendedUse?.some((iu) =>
          iu.credential.some((c) => c.meta === query.intendedUseCredentialMeta),
        ),
      );
    }

    if (query.intendedUseCredentialFormat) {
      results = results.filter((rp) =>
        rp.intendedUse?.some((iu) =>
          iu.credential.some(
            (c) => c.format === query.intendedUseCredentialFormat,
          ),
        ),
      );
    }

    // Cursor-based pagination
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const cursorIndex = query.cursor
      ? results.findIndex((rp) => rp.id === query.cursor)
      : 0;
    const startIndex = cursorIndex >= 0 ? cursorIndex : 0;
    const paginatedResults = results.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < results.length
        ? results[startIndex + limit].id
        : undefined;

    return {
      items: paginatedResults.map((rp) => this.toPublicResponse(rp)),
      nextCursor,
      total: results.length,
    };
  }

  findOne(identifier: string) {
    const rp = this.relyingParties.find(
      (rp) =>
        rp.identifier.some((id) => id.value === identifier) ||
        rp.id === identifier,
    );
    if (!rp) {
      throw new NotFoundException(
        `Relying party with identifier ${identifier} not found`,
      );
    }
    return this.toPublicResponse(rp);
  }

  findAllByUser(userId: string) {
    return this.relyingParties
      .filter((rp) => rp.ownerId === userId)
      .map((rp) => this.toPublicResponse(rp));
  }

  checkIntendedUse(query: CheckIntendedUseQueryDto): IntendedUse {
    const rp = this.relyingParties.find((r) =>
      r.identifier.some((id) => id.value === query.identifier),
    );
    if (!rp?.intendedUse) throw new NotFoundException('Not found');

    const iu = rp.intendedUse.find((iu) => {
      // intendedUseIdentifier 체크
      if (
        query.intendedUseIdentifier &&
        iu.intendedUseIdentifier !== query.intendedUseIdentifier
      ) {
        return false;
      }

      // purpose 체크
      if (query.purpose) {
        const hasPurpose = iu.purpose.some((p) =>
          p.content.toLowerCase().includes(query.purpose!.toLowerCase()),
        );
        if (!hasPurpose) return false;
      }

      // credential 관련 체크
      if (query.credentialFormat || query.credentialMeta || query.claimPath) {
        const hasCredential = iu.credential.some((c) => {
          if (query.credentialFormat && c.format !== query.credentialFormat)
            return false;
          if (query.credentialMeta && c.meta !== query.credentialMeta)
            return false;
          if (
            query.claimPath &&
            !c.claim?.some((cl) => cl.path.includes(query.claimPath!))
          ) {
            return false;
          }
          return true;
        });
        if (!hasCredential) return false;
      }

      return true;
    });

    if (!iu) throw new NotFoundException('Not found');
    return iu;
  }

  create(dto: CreateRelyingPartyDto, ownerId: string): WalletRelyingParty {
    const id = randomUUID();
    const registryURI = `/wrp/${id}`;

    // Registrar assigns intendedUseIdentifier and createdAt for each intended use
    const intendedUse = dto.intendedUse?.map((iu) => ({
      ...iu,
      intendedUseIdentifier: randomUUID(),
      createdAt: new Date().toISOString().split('T')[0],
    }));

    const rp: WalletRelyingParty = {
      ...dto,
      id,
      ownerId,
      registryURI,
      intendedUse,
      accessCertificates: [],
      registrationCertificates: [],
    };

    this.relyingParties.push(rp);
    return rp;
  }

  update(
    id: string,
    dto: UpdateRelyingPartyDto,
    ownerId: string,
  ): WalletRelyingParty {
    const index = this.relyingParties.findIndex((rp) => rp.id === id);
    if (index === -1) {
      throw new NotFoundException(`Relying party with id ${id} not found`);
    }

    const rp = this.relyingParties[index];
    if (rp.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Not authorized to update this relying party',
      );
    }

    // Assign intendedUseIdentifier for new intended uses
    let intendedUse = rp.intendedUse;
    if (dto.intendedUse) {
      intendedUse = dto.intendedUse.map((iu) => ({
        ...iu,
        intendedUseIdentifier: randomUUID(),
        createdAt: new Date().toISOString().split('T')[0],
      }));
    }

    const updated: WalletRelyingParty = {
      ...rp,
      ...dto,
      intendedUse,
    };

    this.relyingParties[index] = updated;
    return updated;
  }

  delete(id: string, ownerId: string): void {
    const index = this.relyingParties.findIndex((rp) => rp.id === id);
    if (index === -1) {
      throw new NotFoundException(`Relying party with id ${id} not found`);
    }

    const rp = this.relyingParties[index];
    if (rp.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Not authorized to delete this relying party',
      );
    }

    this.relyingParties.splice(index, 1);
  }

  // --- Certificate management (stored in the same RP object) ---

  addAccessCertificate(
    rpId: string,
    entry: Omit<AccessCertificateEntry, 'issuedAt'>,
  ): AccessCertificateEntry {
    const rp = this.relyingParties.find((r) => r.id === rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    const certEntry: AccessCertificateEntry = {
      ...entry,
      issuedAt: new Date().toISOString(),
    };
    rp.accessCertificates.push(certEntry);
    return certEntry;
  }

  getAccessCertificates(rpId: string): AccessCertificateEntry[] {
    const rp = this.relyingParties.find((r) => r.id === rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    return rp.accessCertificates;
  }

  findAccessCertificate(
    rpId: string,
    certId: string,
  ): AccessCertificateEntry | undefined {
    const rp = this.relyingParties.find((r) => r.id === rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    return rp.accessCertificates.find((c) => c.id === certId);
  }

  revokeAccessCertificate(
    rpId: string,
    certId: string,
  ): AccessCertificateEntry {
    const rp = this.relyingParties.find((r) => r.id === rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    const cert = rp.accessCertificates.find((c) => c.id === certId);
    if (!cert) {
      throw new NotFoundException(`Access certificate ${certId} not found`);
    }
    cert.revokedAt = new Date().toISOString();
    return cert;
  }

  addRegistrationCertificate(
    rpId: string,
    entry: Omit<RegistrationCertificateEntry, 'issuedAt'>,
  ): RegistrationCertificateEntry {
    const rp = this.relyingParties.find((r) => r.id === rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    const certEntry: RegistrationCertificateEntry = {
      ...entry,
      issuedAt: new Date().toISOString(),
    };
    rp.registrationCertificates.push(certEntry);
    return certEntry;
  }

  getRegistrationCertificates(rpId: string): RegistrationCertificateEntry[] {
    const rp = this.relyingParties.find((r) => r.id === rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    return rp.registrationCertificates;
  }

  revokeRegistrationCertificate(
    rpId: string,
    certId: string,
  ): RegistrationCertificateEntry {
    const rp = this.relyingParties.find((r) => r.id === rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    const cert = rp.registrationCertificates.find((c) => c.id === certId);
    if (!cert) {
      throw new NotFoundException(
        `Registration certificate ${certId} not found`,
      );
    }
    cert.revokedAt = new Date().toISOString();
    return cert;
  }
}
