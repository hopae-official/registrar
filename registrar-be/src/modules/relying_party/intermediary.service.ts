import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RelyingPartyService } from './relying_party.service';
import { AccessCertService } from '../access_cert/access_cert.service';
import { RegistrationCertService } from '../registration_cert/registration_cert.service';
import {
  CreateRelyingPartyDto,
  UpdateRelyingPartyDto,
  AccessCertificateRegistrationDto,
  RegistrationCertificateCreationDto,
} from './relying_party.dto';

@Injectable()
export class IntermediaryService {
  constructor(
    private readonly rpService: RelyingPartyService,
    private readonly accessCertService: AccessCertService,
    private readonly regCertService: RegistrationCertService,
  ) {}

  /** Verify that the WRP exists, belongs to the user, and is an intermediary. */
  async assertIntermediary(intermediaryId: string, userId: string) {
    const rp = await this.rpService.getById(intermediaryId);
    if (!rp) {
      throw new NotFoundException(
        `Intermediary with id ${intermediaryId} not found`,
      );
    }
    if (rp.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to manage this intermediary');
    }
    if (!rp.isIntermediary) {
      throw new BadRequestException('This WRP is not registered as an intermediary');
    }
    return rp;
  }

  /** Verify that a mediated RP belongs to the given intermediary. */
  private async assertMediatedRP(
    intermediaryId: string,
    rpId: string,
    userId: string,
  ) {
    const intermediary = await this.assertIntermediary(intermediaryId, userId);
    const rp = await this.rpService.getById(rpId);
    if (!rp) {
      throw new NotFoundException(`Mediated RP with id ${rpId} not found`);
    }
    if (rp.ownerId !== userId) {
      throw new ForbiddenException('Not authorized to manage this mediated RP');
    }
    const linked = rp.usesIntermediary?.some((ref) =>
      ref.identifier.some((refId) =>
        intermediary.identifier.some((iid) => iid.identifier === refId.identifier),
      ),
    );
    if (!linked) {
      throw new BadRequestException(
        'This RP is not linked to the specified intermediary',
      );
    }
    return rp;
  }

  // --- Intermediary self-management ---

  registerIntermediary(dto: CreateRelyingPartyDto, userId: string) {
    dto.isIntermediary = true;
    return this.rpService.create(dto, userId);
  }

  listMyIntermediaries(userId: string) {
    return this.rpService.findIntermediariesByUser(userId);
  }

  async updateIntermediary(
    id: string,
    dto: UpdateRelyingPartyDto,
    userId: string,
  ) {
    await this.assertIntermediary(id, userId);
    return this.rpService.update(id, dto, userId);
  }

  async deleteIntermediary(id: string, userId: string) {
    await this.assertIntermediary(id, userId);
    await this.rpService.delete(id, userId);
  }

  // --- Intermediary's own Access Certificates (WRPAC) ---

  async createAccessCert(
    intermediaryId: string,
    dto: AccessCertificateRegistrationDto,
    userId: string,
  ) {
    await this.assertIntermediary(intermediaryId, userId);
    dto.rpId = intermediaryId;
    return this.accessCertService.register(dto);
  }

  async getAccessCerts(intermediaryId: string, userId: string) {
    await this.assertIntermediary(intermediaryId, userId);
    return this.accessCertService.getAll(intermediaryId);
  }

  async revokeAccessCert(
    intermediaryId: string,
    certId: string,
    userId: string,
  ) {
    await this.assertIntermediary(intermediaryId, userId);
    return this.accessCertService.revoke(intermediaryId, certId);
  }

  // --- Mediated RP management ---

  async registerMediatedRP(
    intermediaryId: string,
    dto: CreateRelyingPartyDto,
    userId: string,
  ) {
    const intermediary = await this.assertIntermediary(intermediaryId, userId);

    // Force mediated RP settings
    dto.isIntermediary = false;
    dto.usesIntermediary = [
      {
        identifier: intermediary.identifier,
        tradeName: intermediary.tradeName,
        registryURI: intermediary.registryURI,
      },
    ];

    return this.rpService.create(dto, userId);
  }

  listMediatedRPs(intermediaryId: string, userId: string) {
    return this.rpService.findMediatedRPs(intermediaryId, userId);
  }

  async updateMediatedRP(
    intermediaryId: string,
    rpId: string,
    dto: UpdateRelyingPartyDto,
    userId: string,
  ) {
    await this.assertMediatedRP(intermediaryId, rpId, userId);
    return this.rpService.update(rpId, dto, userId);
  }

  async deleteMediatedRP(intermediaryId: string, rpId: string, userId: string) {
    await this.assertMediatedRP(intermediaryId, rpId, userId);
    await this.rpService.delete(rpId, userId);
  }

  // --- Mediated RP Registration Certificates (WRPRC) ---

  async createRegistrationCert(
    intermediaryId: string,
    rpId: string,
    dto: RegistrationCertificateCreationDto,
    userId: string,
  ) {
    await this.assertMediatedRP(intermediaryId, rpId, userId);
    dto.rpId = rpId;
    dto.intermediary = intermediaryId;
    return this.regCertService.create(dto);
  }

  async getRegistrationCerts(
    intermediaryId: string,
    rpId: string,
    userId: string,
  ) {
    await this.assertMediatedRP(intermediaryId, rpId, userId);
    return this.regCertService.getAll(rpId);
  }

  async revokeRegistrationCert(
    intermediaryId: string,
    rpId: string,
    certId: string,
    userId: string,
  ) {
    await this.assertMediatedRP(intermediaryId, rpId, userId);
    return this.regCertService.revoke(rpId, certId);
  }
}
