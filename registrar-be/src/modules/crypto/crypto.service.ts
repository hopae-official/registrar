import { Injectable, OnModuleInit } from '@nestjs/common';
import { OpenSSLService, WrpacSubject } from './openssl.service';
import { JWTHeaderParameters, JWTPayload, SignJWT } from 'jose';
import { ConfigService } from '@nestjs/config';
import { Token, ProtectedHeaders } from '@lukas.j.han/jades';
import { createHash } from 'node:crypto';

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
    subject: WrpacSubject,
    publicKey: string,
    dns?: string[],
  ): Promise<{ serialNumber: string; certificate: string }> {
    return this.openssl.createCert(subject, publicKey, dns);
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

  /**
   * JAdES baseline (B-B) signature over `payload`, as required for a WRPRC by ETSI TS 119 475
   * clause 5.2.1 (GEN-5.2.1-04) → ETSI TS 119 182-1. The protected header carries `typ`, `alg`, the
   * signing-certificate chain (`x5c`) and its SHA-256 thumbprint (`x5t#S256`), and the claimed signing
   * time `sigT`; the jades library adds `b64` and the `crit` list (`sigT`, `b64`). Unlike `signJWT`,
   * no `iss`/`iat` are injected into the header — protocol claims belong in the payload.
   */
  signJAdES(payload: Record<string, unknown>, typ: string): string {
    const x5tS256 = createHash('sha256')
      .update(this.openssl.ownCertDer)
      .digest('base64url');
    // JAdES sigT is an ISO-8601 UTC instant without fractional seconds.
    const sigT = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const token = new Token(payload);
    token.setProtectedHeaders(
      new ProtectedHeaders({ typ, x5c: this.x5c, x5tS256, sigT }),
    );
    token.sign('ES256', this.openssl.privateKey());
    return token.toString();
  }

  async revokeCert(certificatePem: string): Promise<void> {
    return this.openssl.revoke(certificatePem);
  }

  getCrlDer(): Buffer | null {
    return this.openssl.getCrlDer();
  }
}
