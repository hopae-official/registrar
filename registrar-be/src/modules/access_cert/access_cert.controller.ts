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
import { AccessCertService } from './access_cert.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('wrp/:rpId/access-certs')
export class AccessCertController {
  constructor(private readonly accessCertService: AccessCertService) {}

  @Get()
  getAll(@Param('rpId') rpId: string) {
    return this.accessCertService.getAll(rpId);
  }

  @UseGuards(JwtGuard)
  @Post()
  add(
    @Param('rpId') rpId: string,
    @Body() body: { certificate: string },
  ) {
    return this.accessCertService.add(rpId, body.certificate);
  }

  @UseGuards(JwtGuard)
  @Put(':index/revoke')
  revoke(
    @Param('rpId') rpId: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.accessCertService.revoke(rpId, index);
  }
}
