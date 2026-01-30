import { Controller } from '@nestjs/common';
import { AccessCertService } from './access_cert.service';

@Controller('acs')
export class AccessCertController {
  constructor(private readonly accessCertService: AccessCertService) {}
}
