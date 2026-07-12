import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { OpenSSLService } from './openssl.service';

/**
 * Publishes the Registrar's CA (trust anchor) so relying parties, wallets and the Trusted List can fetch it.
 * Served unauthenticated under the global `registrar` prefix: /registrar/ca-certificate(.der).
 */
@Controller()
export class CaController {
  constructor(private readonly openssl: OpenSSLService) {}

  @Get('ca-certificate')
  @Header('content-type', 'application/x-pem-file')
  @Header('cache-control', 'public, max-age=3600')
  caPem(): string {
    return this.openssl.ownCert;
  }

  @Get('ca-certificate.der')
  caDer(@Res() reply: FastifyReply) {
    void reply
      .header('content-type', 'application/pkix-cert')
      .header('cache-control', 'public, max-age=3600')
      .send(this.openssl.ownCertDer);
  }
}
