import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  createPublicKey,
  KeyObject,
  randomBytes,
  createPrivateKey,
} from 'node:crypto';
import { Mutex } from 'async-mutex';

const execAsync = promisify(exec);

/**
 * WRPAC subject/SAN attributes per ETSI TS 119 475 Table 1 (legal person). The X.509 encoding of each
 * (commonName/organizationName/organizationIdentifier/countryName in the DN; supportURI/email/phone in
 * the SAN) follows ETSI EN 319 412-3; the KU/EKU and certificate policy are governed by ETSI TS 119 411-8.
 */
export interface WrpacSubject {
  commonName: string;
  organizationName: string;
  organizationIdentifier: string;
  country: string;
  email?: string;
  phone?: string;
  supportURI?: string;
}

@Injectable()
export class OpenSSLService implements OnModuleInit {
  private readonly logger = new Logger(OpenSSLService.name);
  private readonly mutex = new Mutex();

  private readonly folder: string;
  private readonly privateKeyPath: string;
  private readonly certPath: string;
  private readonly crlFile: string;
  readonly crlFileDer: string;
  private readonly crlIndexFile: string;
  private readonly crlNumberFile: string;
  private readonly openSSLConfigPath: string;
  private readonly crlHostPath: string;
  private readonly host: string;

  private cachedCert: string | null = null;
  private cachedPrivateKey: KeyObject | null = null;

  constructor(private configService: ConfigService) {
    this.folder = this.configService.get<string>(
      'CONFIG_FOLDER',
      join(process.cwd(), '.certs'),
    );
    const apiBaseUrl = this.configService.get<string>(
      'API_BASE_URL',
      'http://localhost:18000',
    );
    this.host = this.configService.get<string>(
      'HOST',
      'http://localhost:18000',
    );

    this.privateKeyPath = join(this.folder, 'ca.key');
    this.certPath = join(this.folder, 'ca.crt');
    this.crlFile = join(this.folder, 'crl.pem');
    this.crlFileDer = join(this.folder, 'crl.der');
    this.crlIndexFile = join(this.folder, 'index.txt');
    this.crlNumberFile = join(this.folder, 'crlnumber');
    this.openSSLConfigPath = join(this.folder, 'openssl.cnf');
    this.crlHostPath = `${apiBaseUrl}/status-management/crl`;
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    this.ensureFolderExists();
    this.createOpenSSLConfig();
    await this.loadCaFromEnv();
  }

  /**
   * Persistent CA: if `REGISTRAR_CA_CERT` + `REGISTRAR_CA_KEY` are set (PEM), write them so the CA survives
   * container restarts and matches the anchor published in the Trusted List. If unset, `generateKeysAndCert()`
   * mints an ephemeral CA (dev only — a fresh container would otherwise invalidate all issued certs).
   */
  private async loadCaFromEnv(): Promise<void> {
    const certPem = this.configService.get<string>('REGISTRAR_CA_CERT');
    const keyPem = this.configService.get<string>('REGISTRAR_CA_KEY');
    if (!certPem || !keyPem) return;
    writeFileSync(this.certPath, certPem.trim() + '\n');
    writeFileSync(this.privateKeyPath, keyPem.trim() + '\n');
    await execAsync(
      `openssl x509 -in ${this.certPath} -outform der -out ${this.certPath}.der`,
    );
    this.cachedCert = null;
    this.cachedPrivateKey = null;
    this.logger.log('CA loaded from env (REGISTRAR_CA_CERT / REGISTRAR_CA_KEY)');
  }

  private ensureFolderExists(): void {
    if (!existsSync(this.folder)) {
      mkdirSync(this.folder, { recursive: true });
    }
    const newcertsPath = join(this.folder, 'newcerts');
    if (!existsSync(newcertsPath)) {
      mkdirSync(newcertsPath, { recursive: true });
    }
    const configDir = join(this.folder, 'config');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
  }

  get ownCert(): string {
    if (!this.cachedCert) {
      this.cachedCert = readFileSync(this.certPath, 'utf8');
    }
    return this.cachedCert;
  }

  get ownCertDer(): Buffer {
    return readFileSync(`${this.certPath}.der`);
  }

  privateKey(): KeyObject {
    if (!this.cachedPrivateKey) {
      this.cachedPrivateKey = createPrivateKey(
        readFileSync(this.privateKeyPath, 'utf8'),
      );
    }
    return this.cachedPrivateKey;
  }

  async generateKeysAndCert(subject = '/C=LU/CN=Registrar'): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (existsSync(this.privateKeyPath) && existsSync(this.certPath)) {
        this.logger.debug('CA keys already exist, skipping generation');
        return;
      }

      this.logger.log('Generating CA keys and certificate...');

      await execAsync(
        `openssl ecparam -genkey -name prime256v1 -noout -out ${this.privateKeyPath}`,
      );
      await execAsync(
        `openssl req -new -x509 -key ${this.privateKeyPath} -out ${this.certPath} -days 730 -subj "${subject}" -config ${this.openSSLConfigPath} -extensions v3_ca`,
      );
      await execAsync(
        `openssl x509 -in ${this.certPath} -outform der -out ${this.certPath}.der`,
      );

      this.cachedCert = null;
      this.cachedPrivateKey = null;
      this.logger.log('CA keys and certificate generated');

      if (!existsSync(this.crlFile)) {
        await this.createCrlInternal();
      }
    });
  }

  async createCert(
    subject: WrpacSubject,
    publicKeyPem: string,
    dns?: string[],
  ): Promise<{ serialNumber: string; certificate: string }> {
    return this.mutex.runExclusive(async () => {
      const configDir = join(this.folder, 'config');
      const serialNumber = randomBytes(8).toString('hex').toUpperCase();
      const publicKeyPath = join(configDir, `${serialNumber}.pub.pem`);
      const csrPath = join(configDir, `${serialNumber}.csr`);
      const configPath = join(configDir, `${serialNumber}.cnf`);
      const serialFile = join(configDir, `${serialNumber}.serial`);
      const certPath = join(configDir, `${serialNumber}.pem`);
      const tempFiles = [
        publicKeyPath,
        csrPath,
        configPath,
        serialFile,
        certPath,
      ];

      this.logger.log(
        `Creating certificate for RP: ${subject.commonName}, serial: ${serialNumber}`,
      );

      try {
        this.validatePublicKey(publicKeyPem);

        writeFileSync(serialFile, serialNumber);
        writeFileSync(
          configPath,
          this.generateCertConfig(subject, dns, serialFile),
        );
        writeFileSync(publicKeyPath, publicKeyPem);

        await execAsync(
          `openssl req -new -key ${this.privateKeyPath} -out ${csrPath} -config ${configPath}`,
        );

        await execAsync(
          `openssl x509 -req -in ${csrPath} -force_pubkey ${publicKeyPath} -CA ${this.certPath} -CAkey ${this.privateKeyPath} -CAcreateserial -days 365 -extfile ${configPath} -extensions v3_req -out ${certPath}`,
        );

        const certificate = readFileSync(certPath, 'utf8');
        this.logger.log(`Certificate created for RP: ${subject.commonName}`);
        return { serialNumber, certificate };
      } finally {
        for (const f of tempFiles) {
          try {
            if (existsSync(f)) unlinkSync(f);
          } catch {
            /* ignore cleanup errors */
          }
        }
      }
    });
  }

  private validatePublicKey(publicKeyPem: string): void {
    let publicKey: KeyObject;
    try {
      publicKey = createPublicKey(publicKeyPem);
    } catch {
      throw new Error(
        'Invalid public key format. Must be a valid PEM-encoded public key.',
      );
    }
    if (publicKey.asymmetricKeyType !== 'ec') {
      throw new Error('Only EC (Elliptic Curve) keys are supported.');
    }
    const keyDetails = publicKey.export({ format: 'jwk' }) as { crv?: string };
    if (keyDetails.crv !== 'P-256') {
      throw new Error(
        `Only P-256 (prime256v1) curve is supported. Provided: ${keyDetails.crv ?? 'unknown'}`,
      );
    }
  }

  private generateCertConfig(
    subject: WrpacSubject,
    dns: string[] | undefined,
    serialFile: string,
  ): string {
    // SAN per ETSI TS 119 475 Table 1: DNS (for OpenID4VP x509_san_dns reader auth) plus the WRP's
    // supportURI (uniformResourceIdentifier), email (rfc822Name) and phone (otherName encoded as
    // id-at-telephoneNumber, OID 2.5.4.20).
    const altLines: string[] = [];
    (dns ?? []).forEach((d, i) => altLines.push(`DNS.${i + 1} = ${d}`));
    if (subject.supportURI) altLines.push(`URI.1 = ${subject.supportURI}`);
    if (subject.email) altLines.push(`email.1 = ${subject.email}`);
    if (subject.phone) {
      altLines.push(`otherName.1 = 2.5.4.20;UTF8:${subject.phone}`);
    }
    const altNames = altLines.join('\n');
    const sanLine = altLines.length ? 'subjectAltName = @alt_names' : '';

    return `
[ ca ]
default_ca = CA_default

[ CA_default ]
dir             = ${this.folder}
certs           = $dir/certs
crl_dir         = $dir/crl
database        = ${this.crlIndexFile}
new_certs_dir   = $dir/newcerts
certificate     = ${this.certPath}
crlnumber       = ${this.crlNumberFile}
private_key     = ${this.privateKeyPath}
serial          = ${serialFile}
RANDFILE        = $dir/private/.rand
default_crl_days = 30
default_md      = sha256
policy          = policy_match
crl             = ${this.crlFile}
default_days    = 365
unique_subject  = no
random_serial   = yes

[ crl_ext ]
authorityKeyIdentifier=keyid:always

[ req ]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
oid_section = custom_oids

[ custom_oids ]
organizationIdentifier = 2.5.4.97

[ req_distinguished_name ]
countryName = ${subject.country}
organizationName = ${subject.organizationName}
organizationIdentifier = ${subject.organizationIdentifier}
commonName = ${subject.commonName}

[ policy_match ]
countryName             = supplied
organizationName        = supplied
organizationIdentifier  = supplied
commonName              = supplied

[ alt_names ]
${altNames}

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature
${sanLine}
crlDistributionPoints = URI:${this.crlHostPath}
`;
  }

  async revoke(certificatePem: string): Promise<void> {
    return this.mutex.runExclusive(async () => {
      const tempDir = join(this.folder, 'temp');
      if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

      const tempCertPath = join(tempDir, `revoke-${Date.now()}.pem`);

      try {
        writeFileSync(tempCertPath, certificatePem);
        await execAsync(
          `openssl ca -revoke ${tempCertPath} -config ${this.openSSLConfigPath} -crl_reason cessationOfOperation`,
        );
        await this.createCrlInternal();
      } finally {
        try {
          if (existsSync(tempCertPath)) unlinkSync(tempCertPath);
        } catch {
          /* ignore */
        }
      }
    });
  }

  async createCrl(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      await this.createCrlInternal();
    });
  }

  private async createCrlInternal(): Promise<void> {
    this.logger.log('Generating CRL...');
    await execAsync(
      `openssl ca -gencrl -config ${this.openSSLConfigPath} -out ${this.crlFile}`,
    );
    await execAsync(
      `openssl crl -in ${this.crlFile} -outform der -out ${this.crlFileDer}`,
    );
    this.logger.log('CRL generated');
  }

  getCrlDer(): Buffer | null {
    if (existsSync(this.crlFileDer)) {
      return readFileSync(this.crlFileDer);
    }
    return null;
  }

  private createOpenSSLConfig(): void {
    const sanDNSName = this.host.replace(/^https?:\/\//, '');

    const config = `[ ca ]
default_ca = CA_default

[ CA_default ]
dir             = ${this.folder}
certs           = $dir/certs
crl_dir         = $dir/crl
database        = ${this.crlIndexFile}
new_certs_dir   = $dir/newcerts
certificate     = ${this.certPath}
crlnumber       = ${this.crlNumberFile}
private_key     = ${this.privateKeyPath}
RANDFILE        = $dir/private/.rand
default_crl_days = 30
default_md       = sha256
policy           = policy_match
crl             = ${this.crlFile}
random_serial   = yes
unique_subject  = no

[ crl_ext ]
authorityKeyIdentifier=keyid:always

[ req ]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca

[ req_distinguished_name ]

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
issuerAltName = @issuer_alt_name
crlDistributionPoints = URI:${this.crlHostPath}

[ issuer_alt_name ]
URI.1 = ${this.host}

[ alt_names ]
DNS.1 = ${sanDNSName}
`;

    writeFileSync(this.openSSLConfigPath, config);

    if (!existsSync(this.crlIndexFile)) {
      writeFileSync(this.crlIndexFile, '');
    }
    if (!existsSync(this.crlNumberFile)) {
      writeFileSync(this.crlNumberFile, '01');
    }
  }
}
