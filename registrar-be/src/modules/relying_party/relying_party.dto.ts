import { ApiProperty } from '@nestjs/swagger';

// TS5/TS6 Auxiliary Schema Classes

export class MultiLangString {
  lang: string;
  content: string;
}

export class Claim {
  path: (string | null | number)[];
  values?: (string | number | boolean)[];
}

export class Credential {
  format: string;
  meta: any;
  claim?: Claim[];
}

export class Policy {
  type: string;
  uri: string;
}

export class Identifier {
  type: string;
  value: string;
}

export class SupervisoryAuthority {
  legalName: string;
  identifier?: Identifier[];
  email?: string;
  phone?: string;
  infoURI?: string[];
}

export class IntermediaryRef {
  identifier: Identifier[];
  tradeName?: string;
  registryURI: string;
}

// Certificate entry types stored in the RP object

export class AccessCertificateEntry {
  id: string; // serial number
  certificate: string; // PEM-encoded X.509 certificate
  dns?: string[];
  issuedAt: string;
  revokedAt?: string;
}

export class RegistrationCertificateEntry {
  id: string; // jti UUID
  jwt: string; // signed JWT
  intendedUse: { purpose: MultiLangString[] };
  issuedAt: string;
  revokedAt?: string;
}

// Intended use input DTO (intendedUseIdentifier & createdAt are Registrar-provided)
export class CreateIntendedUseDto {
  purpose: MultiLangString[];
  privacyPolicy: Policy[];
  credential: Credential[];
}

// Full IntendedUse (as stored / returned)
export class IntendedUse {
  purpose: MultiLangString[];
  privacyPolicy: Policy[];
  intendedUseIdentifier: string;
  createdAt: string;
  revokedAt?: string;
  credential: Credential[];
}

// Main WalletRelyingParty stored in-memory (single object with all info)
export interface WalletRelyingParty {
  id: string;
  ownerId: string;

  // LegalEntity inherited fields
  legalName?: string;
  givenName?: string;
  familyName?: string;
  identifier: Identifier[];
  infoURI?: string[];
  postalAddress?: string;
  phone?: string;
  email?: string;

  // WRP-specific fields
  tradeName?: string;
  supportURI: string[];
  srvDescription: MultiLangString[];
  intendedUse?: IntendedUse[];
  isPSB: boolean;
  entitlement: string[];
  providesAttestations?: Credential[];
  supervisoryAuthority: SupervisoryAuthority;
  registryURI: string;
  usesIntermediary?: IntermediaryRef[];
  isIntermediary: boolean;

  // Certificates stored in same object
  accessCertificates: AccessCertificateEntry[];
  registrationCertificates: RegistrationCertificateEntry[];
}

// --- DTOs ---

export class CreateRelyingPartyDto {
  legalName?: string;
  givenName?: string;
  familyName?: string;
  identifier: Identifier[];
  infoURI?: string[];
  postalAddress?: string;
  phone?: string;
  email?: string;
  tradeName?: string;
  supportURI: string[];
  srvDescription: MultiLangString[];
  intendedUse?: CreateIntendedUseDto[];
  isPSB: boolean;
  entitlement: string[];
  providesAttestations?: Credential[];
  supervisoryAuthority: SupervisoryAuthority;
  usesIntermediary?: IntermediaryRef[];
  isIntermediary: boolean;
}

export class UpdateRelyingPartyDto {
  legalName?: string;
  givenName?: string;
  familyName?: string;
  identifier?: Identifier[];
  infoURI?: string[];
  postalAddress?: string;
  phone?: string;
  email?: string;
  tradeName?: string;
  supportURI?: string[];
  srvDescription?: MultiLangString[];
  intendedUse?: CreateIntendedUseDto[];
  isPSB?: boolean;
  entitlement?: string[];
  providesAttestations?: Credential[];
  supervisoryAuthority?: SupervisoryAuthority;
  usesIntermediary?: IntermediaryRef[];
  isIntermediary?: boolean;
}

export class SearchRelyingPartyQueryDto {
  identifier?: string;
  legalname?: string;
  tradename?: string;
  policy?: string;
  entitlement?: string;
  providesattestation?: string;
  usesintermediary?: string;
  isintermediary?: string;
  intendeduseidentifier?: string;
  intendedUseClaimPath?: string;
  intendedUseCredentialMeta?: string;
  intendedUseCredentialFormat?: string;
  cursor?: string;
  @ApiProperty({ description: 'Page size (default 20)', required: false })
  limit?: string;
}

export class CheckIntendedUseQueryDto {
  identifier: string;
  intendedUseIdentifier?: string;
  credentialFormat?: string;
  credentialMeta?: string;
  claimPath?: string;
  purpose?: string;
}

// --- Certificate creation DTOs ---

export class AccessCertificateRegistrationDto {
  rpId: string;
  @ApiProperty({
    description: 'PEM-encoded EC P-256 public key',
  })
  publicKey: string;
  @ApiProperty({
    description: 'Subject Alternative Name DNS entries',
    required: false,
  })
  dns?: string[];
}

export class RegistrationCertificateCreationDto {
  rpId: string;
  support_uri: string;
  @ApiProperty({ example: 'https://example.com/privacy-policy' })
  privacy_policy: string;
  purpose?: MultiLangString[];
  credentials?: Credential[];
  provided_attestations?: Credential[];
  intermediary?: string;
}

// Entitlement URIs (ETSI TS 119 475)

export const ENTITLEMENT_URIS = {
  SERVICE_PROVIDER: 'https://uri.etsi.org/19475/Entitlement/Service_Provider',
  QEAA_PROVIDER: 'https://uri.etsi.org/19475/Entitlement/QEAA_Provider',
  NON_Q_EAA_PROVIDER:
    'https://uri.etsi.org/19475/Entitlement/Non_Q_EAA_Provider',
  PUB_EAA_PROVIDER: 'https://uri.etsi.org/19475/Entitlement/PUB_EAA_Provider',
  PID_PROVIDER: 'https://uri.etsi.org/19475/Entitlement/PID_Provider',
  QCERT_FOR_ESEAL_PROVIDER:
    'https://uri.etsi.org/19475/Entitlement/QCert_for_ESeal_Provider',
  QCERT_FOR_ESIG_PROVIDER:
    'https://uri.etsi.org/19475/Entitlement/QCert_for_ESig_Provider',
  RQSEALCDS_PROVIDER:
    'https://uri.etsi.org/19475/Entitlement/rQSealCDs_Provider',
  RQSIGCDS_PROVIDER: 'https://uri.etsi.org/19475/Entitlement/rQSigCDs_Provider',
  ESIG_ESEAL_CREATION_PROVIDER:
    'https://uri.etsi.org/19475/Entitlement/ESig_ESeal_Creation_Provider',
} as const;

export type EntitlementUri =
  (typeof ENTITLEMENT_URIS)[keyof typeof ENTITLEMENT_URIS];

// WRPRC certificate-policy OID (ETSI TS 119 475 clause 6.1.3):
// { itu-t(0) identified-organization(4) etsi(0) eudiwrpa(19475) policy-identifiers(3) wrprc(1) }
export const WRPRC_POLICY_OID = '0.4.0.19475.3.1';

// WRPAC certificate-policy OIDs (ETSI TS 119 411-8 clause 5.3):
// { itu-t(0) identified-organization(4) etsi(0) eudiwrp(194118) policy-identifiers(1) … }
// n = natural person (e-signature), l = legal person (e-seal); QCP = qualified.
export const WRPAC_POLICY_OIDS = {
  NCP_NATURAL: '0.4.0.194118.1.1',
  NCP_LEGAL: '0.4.0.194118.1.2',
  QCP_NATURAL: '0.4.0.194118.1.3',
  QCP_LEGAL: '0.4.0.194118.1.4',
} as const;
