import {
  Controller,
  UseGuards,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RelyingPartyService } from '../relying_party.service';
import { AccessCertService } from '../../access_cert/access_cert.service';
import { RegistrationCertService } from '../../registration_cert/registration_cert.service';
import { JwtGuard } from '../../auth/jwt.guard';
import { AuthenticatedUser } from '../../user/user.deco';
import { AuthPayload } from '../../auth/auth.service';
import {
  CreateRelyingPartyDto,
  UpdateRelyingPartyDto,
  AccessCertificateRegistrationDto,
  RegistrationCertificateCreationDto,
} from '../relying_party.dto';

@ApiTags('2. WRP Portal')
@Controller('portal/wrp')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class WrpPortalController {
  constructor(
    private readonly rpService: RelyingPartyService,
    private readonly accessCertService: AccessCertService,
    private readonly regCertService: RegistrationCertService,
  ) {}

  @Get('my')
  @ApiOperation({ summary: 'List WRPs owned by the authenticated user (non-intermediary)' })
  @ApiResponse({ status: 200, description: 'List of own WRPs' })
  findMy(@AuthenticatedUser() user: AuthPayload) {
    const all = this.rpService.findAllByUser(user.sub);
    return all.filter((rp: any) => !rp.isIntermediary);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new Wallet-Relying Party' })
  @ApiResponse({ status: 201, description: 'WRP created' })
  create(@Body() dto: CreateRelyingPartyDto, @AuthenticatedUser() user: AuthPayload) {
    dto.isIntermediary = false;
    return this.rpService.create(dto, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing WRP' })
  @ApiResponse({ status: 200, description: 'WRP updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.rpService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a WRP' })
  @ApiResponse({ status: 204, description: 'WRP deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  delete(@Param('id') id: string, @AuthenticatedUser() user: AuthPayload) {
    return this.rpService.delete(id, user.sub);
  }

  // --- Access Certificates ---

  @Post(':rpId/access-certs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an access certificate for a WRP' })
  @ApiResponse({ status: 201, description: 'Access certificate created' })
  createAccessCert(
    @Param('rpId') rpId: string,
    @Body() dto: AccessCertificateRegistrationDto,
  ) {
    dto.rpId = rpId;
    return this.accessCertService.register(dto);
  }

  @Delete(':rpId/access-certs/:certId')
  @ApiOperation({ summary: 'Revoke an access certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiResponse({ status: 404, description: 'Not found' })
  revokeAccessCert(@Param('rpId') rpId: string, @Param('certId') certId: string) {
    return this.accessCertService.revoke(rpId, certId);
  }

  // --- Registration Certificates ---

  @Post(':rpId/registration-certs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a registration certificate for a WRP' })
  @ApiResponse({ status: 201, description: 'Registration certificate created' })
  createRegistrationCert(
    @Param('rpId') rpId: string,
    @Body() dto: RegistrationCertificateCreationDto,
  ) {
    dto.rpId = rpId;
    return this.regCertService.create(dto);
  }

  @Delete(':rpId/registration-certs/:certId')
  @ApiOperation({ summary: 'Revoke a registration certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiResponse({ status: 404, description: 'Not found' })
  revokeRegistrationCert(@Param('rpId') rpId: string, @Param('certId') certId: string) {
    return this.regCertService.revoke(rpId, certId);
  }
}
