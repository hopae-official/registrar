import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RegistrationCertService } from './registration_cert.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RegistrationCertificateCreationDto } from '../relying_party/relying_party.dto';

@ApiTags('Registration Certificates')
@Controller('wrp/:rpId/registration-certs')
export class RegistrationCertController {
  constructor(
    private readonly registrationCertService: RegistrationCertService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all registration certificates for a WRP' })
  @ApiResponse({
    status: 200,
    description: 'List of registration certificates',
  })
  getAll(@Param('rpId') rpId: string) {
    return this.registrationCertService.getAll(rpId);
  }

  @Get(':certId')
  @ApiOperation({ summary: 'Get a specific registration certificate' })
  @ApiResponse({ status: 200, description: 'Registration certificate data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('rpId') rpId: string, @Param('certId') certId: string) {
    return this.registrationCertService.findOne(rpId, certId);
  }

  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a JWT-based registration certificate for a WRP',
  })
  @ApiResponse({ status: 201, description: 'Registration certificate created' })
  create(
    @Param('rpId') rpId: string,
    @Body() dto: RegistrationCertificateCreationDto,
  ) {
    dto.rpId = rpId;
    return this.registrationCertService.create(dto);
  }

  @UseGuards(JwtGuard)
  @Delete(':certId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a registration certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiResponse({ status: 404, description: 'Not found' })
  revoke(@Param('rpId') rpId: string, @Param('certId') certId: string) {
    return this.registrationCertService.revoke(rpId, certId);
  }
}
