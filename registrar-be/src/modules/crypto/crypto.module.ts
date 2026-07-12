import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { OpenSSLService } from './openssl.service';
import { CaController } from './ca.controller';

@Module({
  controllers: [CaController],
  providers: [CryptoService, OpenSSLService],
  exports: [CryptoService],
})
export class CryptoModule {}
