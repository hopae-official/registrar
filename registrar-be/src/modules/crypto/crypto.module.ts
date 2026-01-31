import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { OpenSSLService } from './openssl.service';

@Module({
  providers: [CryptoService, OpenSSLService],
  exports: [CryptoService],
})
export class CryptoModule {}
