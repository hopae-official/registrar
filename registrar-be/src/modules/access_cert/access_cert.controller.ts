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
import { AccessCertService } from './access_cert.service';
import { JwtGuard } from '../auth/jwt.guard';
import { AccessCertificateRegistrationDto } from '../relying_party/relying_party.dto';

@ApiTags('Access Certificates')
@Controller('wrp/:rpId/access-certs')
export class AccessCertController {
  constructor(private readonly accessCertService: AccessCertService) {}

  @Get()
  @ApiOperation({ summary: 'List all access certificates for a WRP' })
  @ApiResponse({ status: 200, description: 'List of access certificates' })
  getAll(@Param('rpId') rpId: string) {
    return this.accessCertService.getAll(rpId);
  }

  @Get(':certId')
  @ApiOperation({ summary: 'Get a specific access certificate' })
  @ApiResponse({ status: 200, description: 'Certificate data with PEM' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('rpId') rpId: string, @Param('certId') certId: string) {
    return this.accessCertService.findOne(rpId, certId);
  }

  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an X.509 access certificate for a WRP',
  })
  @ApiResponse({ status: 201, description: 'Certificate created' })
  @ApiResponse({ status: 400, description: 'Invalid public key' })
  register(@Body() dto: AccessCertificateRegistrationDto) {
    return this.accessCertService.register(dto);
  }

  @UseGuards(JwtGuard)
  @Delete(':certId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an access certificate' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiResponse({ status: 404, description: 'Not found' })
  revoke(@Param('rpId') rpId: string, @Param('certId') certId: string) {
    return this.accessCertService.revoke(rpId, certId);
  }
}
