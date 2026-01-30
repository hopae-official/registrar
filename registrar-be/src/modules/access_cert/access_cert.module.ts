import { Module } from '@nestjs/common';
import { AccessCertController } from './access_cert.controller';
import { AccessCertService } from './access_cert.service';

@Module({
  imports: [],
  controllers: [AccessCertController],
  providers: [AccessCertService],
  exports: [AccessCertService],
})
export class AccessCertModule {}
