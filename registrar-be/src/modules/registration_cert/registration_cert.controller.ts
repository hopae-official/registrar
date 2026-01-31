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
import { RegistrationCertService } from './registration_cert.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('wrp/:rpId/registration-certs')
export class RegistrationCertController {
  constructor(
    private readonly registrationCertService: RegistrationCertService,
  ) {}

  @Get()
  getAll(@Param('rpId') rpId: string) {
    return this.registrationCertService.getAll(rpId);
  }

  @UseGuards(JwtGuard)
  @Post()
  add(
    @Param('rpId') rpId: string,
    @Body() body: { certificate: string; intendedUseIdentifier: string },
  ) {
    return this.registrationCertService.add(
      rpId,
      body.certificate,
      body.intendedUseIdentifier,
    );
  }

  @UseGuards(JwtGuard)
  @Put(':index/revoke')
  revoke(
    @Param('rpId') rpId: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.registrationCertService.revoke(rpId, index);
  }
}
