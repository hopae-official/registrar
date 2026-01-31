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
import { AccessCertService } from './access_cert.service';
import { JwtGuard } from '../auth/jwt.guard';
import { AddAccessCertDto } from '../relying_party/relying_party.dto';

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

  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an access certificate to a WRP' })
  @ApiResponse({ status: 201, description: 'Certificate added' })
  add(@Param('rpId') rpId: string, @Body() body: AddAccessCertDto) {
    return this.accessCertService.add(rpId, body.certificate);
  }

  @UseGuards(JwtGuard)
  @Put(':index/revoke')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an access certificate by index' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  revoke(
    @Param('rpId') rpId: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.accessCertService.revoke(rpId, index);
  }
}
