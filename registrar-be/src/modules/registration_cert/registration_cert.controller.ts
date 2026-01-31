import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RegistrationCertService } from './registration_cert.service';
import { JwtGuard } from '../auth/jwt.guard';
import { AddRegistrationCertDto } from '../relying_party/relying_party.dto';

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

  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a registration certificate to a WRP' })
  @ApiResponse({ status: 201, description: 'Certificate added' })
  add(@Param('rpId') rpId: string, @Body() body: AddRegistrationCertDto) {
    return this.registrationCertService.add(
      rpId,
      body.certificate,
      body.intendedUseIdentifier,
    );
  }

  @UseGuards(JwtGuard)
  @Put(':index/revoke')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a registration certificate by index' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  revoke(
    @Param('rpId') rpId: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.registrationCertService.revoke(rpId, index);
  }
}
