import { Injectable, OnModuleInit } from '@nestjs/common';
import { OpenSSLService } from './openssl.service';
import { JWTHeaderParameters, JWTPayload, SignJWT } from 'jose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CryptoService implements OnModuleInit {
  x5c: string[];
  issuer: string;
  private initialized = false;

  constructor(
    public openssl: OpenSSLService,
    private readonly configService: ConfigService,
  ) {
    this.issuer = this.configService.get<string>(
      'API_BASE_URL',
      'https://registrar-api.dev.hopae.app',
    );
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.openssl.generateKeysAndCert();
    this.x5c = this.generateX5c(this.openssl.ownCert);
    this.initialized = true;
  }

  private generateX5c(certPem: string): string[] {
    const b64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');
    return [b64];
  }

  async createCert(
    rpName: string,
    orgIdentifier: string,
    publicKey: string,
    dns?: string[],
  ): Promise<{ serialNumber: string; certificate: string }> {
    return this.openssl.createCert(rpName, orgIdentifier, publicKey, dns);
  }

  async signJWT(
    payload: JWTPayload,
    header?: Omit<JWTHeaderParameters, 'alg'>,
  ): Promise<string> {
    const jwt = new SignJWT(payload);
    jwt.setProtectedHeader({
      ...header,
      x5c: this.x5c,
      alg: 'ES256',
      iss: this.issuer,
      iat: Math.floor(Date.now() / 1000),
    });
    return jwt.sign(this.openssl.privateKey());
  }

  async revokeCert(certificatePem: string): Promise<void> {
    return this.openssl.revoke(certificatePem);
  }

  getCrlDer(): Buffer | null {
    return this.openssl.getCrlDer();
  }
}
