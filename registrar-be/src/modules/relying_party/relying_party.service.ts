import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../db/drizzle.module';
import { relyingParties as rpTable } from '../../db/schema';
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
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  // --- Postgres-backed persistence (the RP is stored as a jsonb `data` blob) ---

  private async all(): Promise<WalletRelyingParty[]> {
    const rows = await this.db.select().from(rpTable);
    return rows.map((r) => r.data);
  }

  private async byOwner(ownerId: string): Promise<WalletRelyingParty[]> {
    const rows = await this.db
      .select()
      .from(rpTable)
      .where(eq(rpTable.ownerId, ownerId));
    return rows.map((r) => r.data);
  }

  private async byId(id: string): Promise<WalletRelyingParty | undefined> {
    const rows = await this.db
      .select()
      .from(rpTable)
      .where(eq(rpTable.id, id))
      .limit(1);
    return rows[0]?.data;
  }

  private async persist(rp: WalletRelyingParty): Promise<void> {
    await this.db
      .insert(rpTable)
      .values({
        id: rp.id,
        ownerId: rp.ownerId,
        isIntermediary: rp.isIntermediary ?? false,
        data: rp,
      })
      .onConflictDoUpdate({
        target: rpTable.id,
        set: {
          data: rp,
          ownerId: rp.ownerId,
          isIntermediary: rp.isIntermediary ?? false,
          updatedAt: new Date(),
        },
      });
  }

  private async remove(id: string): Promise<void> {
    await this.db.delete(rpTable).where(eq(rpTable.id, id));
  }

  private toPublicResponse(rp: WalletRelyingParty) {
    // Per TS5 spec: exclude physicalAddress from public responses
    const { postalAddress, ownerId, ...publicData } = rp;
    return publicData;
  }

  async getById(id: string): Promise<WalletRelyingParty | undefined> {
    return this.byId(id);
  }

  getUniqueIdentifier(rp: WalletRelyingParty): string {
    // The registered semantic identifier (EORI/LEI/VAT…) — this is what a WRPAC serialNumber and a
    // WRPRC `sub` must carry so the wallet can bind the two certificates (ETSI TS 119 475 Table E.2,
    // GEN-5.2.4-02). Fall back to the internal id only when no identifier was registered.
    return rp.identifier?.[0]?.value ?? rp.id;
  }

  async findAll(query: SearchRelyingPartyQueryDto) {
    let results = await this.all();

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

  async findOne(identifier: string) {
    const all = await this.all();
    const rp = all.find(
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

  async findAllByUser(userId: string) {
    const rps = await this.byOwner(userId);
    return rps.map((rp) => this.toPublicResponse(rp));
  }

  async checkIntendedUse(query: CheckIntendedUseQueryDto): Promise<IntendedUse> {
    const all = await this.all();
    const rp = all.find((r) =>
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

  async create(
    dto: CreateRelyingPartyDto,
    ownerId: string,
  ): Promise<WalletRelyingParty> {
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

    await this.persist(rp);
    return rp;
  }

  async update(
    id: string,
    dto: UpdateRelyingPartyDto,
    ownerId: string,
  ): Promise<WalletRelyingParty> {
    const rp = await this.byId(id);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${id} not found`);
    }

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

    await this.persist(updated);
    return updated;
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const rp = await this.byId(id);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${id} not found`);
    }

    if (rp.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Not authorized to delete this relying party',
      );
    }

    await this.remove(id);
  }

  // --- Intermediary / Mediated RP queries ---

  async findIntermediariesByUser(userId: string) {
    const rows = await this.db
      .select()
      .from(rpTable)
      .where(
        and(eq(rpTable.ownerId, userId), eq(rpTable.isIntermediary, true)),
      );
    return rows.map((r) => this.toPublicResponse(r.data));
  }

  async findMediatedRPs(intermediaryId: string, userId: string) {
    const owned = await this.byOwner(userId);
    const intermediary = owned.find((r) => r.id === intermediaryId);
    if (!intermediary) {
      throw new NotFoundException(
        `Intermediary with id ${intermediaryId} not found`,
      );
    }
    return owned
      .filter(
        (rp) =>
          !rp.isIntermediary &&
          rp.usesIntermediary?.some((ref) =>
            ref.identifier.some((refId) =>
              intermediary.identifier.some((iid) => iid.value === refId.value),
            ),
          ),
      )
      .map((rp) => this.toPublicResponse(rp));
  }

  // --- Intermediary-RP relationship verification (RPI_07a) ---

  async verifyIntermediaryRelationship(
    rpIdentifier: string,
    intermediaryIdentifier: string,
  ): Promise<boolean> {
    const all = await this.all();
    const rp = all.find(
      (r) =>
        r.identifier.some((id) => id.value === rpIdentifier) ||
        r.id === rpIdentifier,
    );
    if (!rp) return false;

    return (
      rp.usesIntermediary?.some((ref) =>
        ref.identifier.some((id) => id.value === intermediaryIdentifier),
      ) ?? false
    );
  }

  // --- Certificate management (stored in the same RP object) ---

  async addAccessCertificate(
    rpId: string,
    entry: Omit<AccessCertificateEntry, 'issuedAt'>,
  ): Promise<AccessCertificateEntry> {
    const rp = await this.byId(rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    const certEntry: AccessCertificateEntry = {
      ...entry,
      issuedAt: new Date().toISOString(),
    };
    rp.accessCertificates.push(certEntry);
    await this.persist(rp);
    return certEntry;
  }

  async getAccessCertificates(rpId: string): Promise<AccessCertificateEntry[]> {
    const rp = await this.byId(rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    return rp.accessCertificates;
  }

  async findAccessCertificate(
    rpId: string,
    certId: string,
  ): Promise<AccessCertificateEntry | undefined> {
    const rp = await this.byId(rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    return rp.accessCertificates.find((c) => c.id === certId);
  }

  async revokeAccessCertificate(
    rpId: string,
    certId: string,
  ): Promise<AccessCertificateEntry> {
    const rp = await this.byId(rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    const cert = rp.accessCertificates.find((c) => c.id === certId);
    if (!cert) {
      throw new NotFoundException(`Access certificate ${certId} not found`);
    }
    cert.revokedAt = new Date().toISOString();
    await this.persist(rp);
    return cert;
  }

  async addRegistrationCertificate(
    rpId: string,
    entry: Omit<RegistrationCertificateEntry, 'issuedAt'>,
  ): Promise<RegistrationCertificateEntry> {
    const rp = await this.byId(rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    const certEntry: RegistrationCertificateEntry = {
      ...entry,
      issuedAt: new Date().toISOString(),
    };
    rp.registrationCertificates.push(certEntry);
    await this.persist(rp);
    return certEntry;
  }

  async getRegistrationCertificates(
    rpId: string,
  ): Promise<RegistrationCertificateEntry[]> {
    const rp = await this.byId(rpId);
    if (!rp) {
      throw new NotFoundException(`Relying party with id ${rpId} not found`);
    }
    return rp.registrationCertificates;
  }

  async revokeRegistrationCertificate(
    rpId: string,
    certId: string,
  ): Promise<RegistrationCertificateEntry> {
    const rp = await this.byId(rpId);
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
    await this.persist(rp);
    return cert;
  }
}
