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
import { JwtGuard } from '../../auth/jwt.guard';
import { AuthenticatedUser } from '../../user/user.deco';
import { AuthPayload } from '../../auth/auth.service';
import { IntermediaryService } from '../intermediary.service';
import {
  CreateRelyingPartyDto,
  UpdateRelyingPartyDto,
  AccessCertificateRegistrationDto,
  RegistrationCertificateCreationDto,
} from '../relying_party.dto';

@ApiTags('3. Intermediary Portal')
@Controller('portal/intermediary')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class IntermediaryPortalController {
  constructor(private readonly intermediaryService: IntermediaryService) {}

  // --- Intermediary self-management ---

  @Get('my')
  @ApiOperation({ summary: 'List intermediaries owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of own intermediaries' })
  listMy(@AuthenticatedUser() user: AuthPayload) {
    return this.intermediaryService.listMyIntermediaries(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as an intermediary' })
  @ApiResponse({ status: 201, description: 'Intermediary created' })
  register(@Body() dto: CreateRelyingPartyDto, @AuthenticatedUser() user: AuthPayload) {
    return this.intermediaryService.registerIntermediary(dto, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an intermediary' })
  @ApiResponse({ status: 200, description: 'Intermediary updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.updateIntermediary(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an intermediary' })
  @ApiResponse({ status: 204, description: 'Intermediary deleted' })
  delete(@Param('id') id: string, @AuthenticatedUser() user: AuthPayload) {
    return this.intermediaryService.deleteIntermediary(id, user.sub);
  }

  // --- Intermediary's own Access Certificates (WRPAC) ---

  @Post(':id/access-certs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an access certificate (WRPAC) for the intermediary' })
  @ApiResponse({ status: 201, description: 'Access certificate created' })
  createAccessCert(
    @Param('id') id: string,
    @Body() dto: AccessCertificateRegistrationDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.createAccessCert(id, dto, user.sub);
  }

  @Get(':id/access-certs')
  @ApiOperation({ summary: 'List access certificates for the intermediary' })
  @ApiResponse({ status: 200, description: 'List of access certificates' })
  getAccessCerts(@Param('id') id: string, @AuthenticatedUser() user: AuthPayload) {
    return this.intermediaryService.getAccessCerts(id, user.sub);
  }

  @Delete(':id/access-certs/:certId')
  @ApiOperation({ summary: 'Revoke an access certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  revokeAccessCert(
    @Param('id') id: string,
    @Param('certId') certId: string,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.revokeAccessCert(id, certId, user.sub);
  }

  // --- Mediated RP management ---

  @Get(':id/mediated-rps')
  @ApiOperation({ summary: 'List mediated Relying Parties for this intermediary' })
  @ApiResponse({ status: 200, description: 'List of mediated RPs' })
  listMediatedRPs(@Param('id') id: string, @AuthenticatedUser() user: AuthPayload) {
    return this.intermediaryService.listMediatedRPs(id, user.sub);
  }

  @Post(':id/mediated-rps')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a mediated Relying Party' })
  @ApiResponse({ status: 201, description: 'Mediated RP created' })
  registerMediatedRP(
    @Param('id') id: string,
    @Body() dto: CreateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.registerMediatedRP(id, dto, user.sub);
  }

  @Put(':id/mediated-rps/:rpId')
  @ApiOperation({ summary: 'Update a mediated Relying Party' })
  @ApiResponse({ status: 200, description: 'Mediated RP updated' })
  updateMediatedRP(
    @Param('id') id: string,
    @Param('rpId') rpId: string,
    @Body() dto: UpdateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.updateMediatedRP(id, rpId, dto, user.sub);
  }

  @Delete(':id/mediated-rps/:rpId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a mediated Relying Party' })
  @ApiResponse({ status: 204, description: 'Mediated RP deleted' })
  deleteMediatedRP(
    @Param('id') id: string,
    @Param('rpId') rpId: string,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.deleteMediatedRP(id, rpId, user.sub);
  }

  // --- Mediated RP Registration Certificates (WRPRC) ---

  @Get(':id/mediated-rps/:rpId/registration-certs')
  @ApiOperation({ summary: 'List registration certificates for a mediated RP' })
  @ApiResponse({ status: 200, description: 'List of registration certificates' })
  getRegistrationCerts(
    @Param('id') id: string,
    @Param('rpId') rpId: string,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.getRegistrationCerts(id, rpId, user.sub);
  }

  @Post(':id/mediated-rps/:rpId/registration-certs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a registration certificate (WRPRC) for a mediated RP' })
  @ApiResponse({ status: 201, description: 'Registration certificate created' })
  createRegistrationCert(
    @Param('id') id: string,
    @Param('rpId') rpId: string,
    @Body() dto: RegistrationCertificateCreationDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.createRegistrationCert(id, rpId, dto, user.sub);
  }

  @Delete(':id/mediated-rps/:rpId/registration-certs/:certId')
  @ApiOperation({ summary: 'Revoke a registration certificate for a mediated RP' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  revokeRegistrationCert(
    @Param('id') id: string,
    @Param('rpId') rpId: string,
    @Param('certId') certId: string,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.intermediaryService.revokeRegistrationCert(id, rpId, certId, user.sub);
  }
}
