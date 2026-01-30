import { Controller } from '@nestjs/common';
import { RelyingPartyService } from './relying_party.service';

@Controller('rps')
export class RelyingPartyController {
  constructor(private readonly relyingPartyService: RelyingPartyService) {}
}
