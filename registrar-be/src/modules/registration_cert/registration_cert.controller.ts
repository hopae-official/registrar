import { Controller } from '@nestjs/common';
import { RegistrationCertService } from './registration_cert.service';

@Controller('rcs')
export class RegistrationCertController {
  constructor(
    private readonly registrationCertService: RegistrationCertService,
  ) {}
}
