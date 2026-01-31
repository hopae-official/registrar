// --- JWT Decoder ---

export interface DecodedJWT {
  header: Record<string, any>;
  payload: Record<string, any>;
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded);
}

export function decodeJWT(jwt: string): DecodedJWT | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload };
  } catch {
    return null;
  }
}

// --- X.509 DER/ASN.1 Decoder ---

export interface DecodedX509 {
  serialNumber: string;
  subject: Record<string, string>;
  issuer: Record<string, string>;
  notBefore: string;
  notAfter: string;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  sanDns: string[];
  crlDistributionPoints: string[];
}

// Well-known OID mappings
const OID_NAMES: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.6': 'C',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.97': 'organizationIdentifier',
  '2.5.4.5': 'serialNumber',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
};

const SIG_ALG_OIDS: Record<string, string> = {
  '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
  '1.2.840.10045.4.3.3': 'ECDSA with SHA-384',
  '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
  '1.2.840.113549.1.1.11': 'RSA with SHA-256',
  '1.2.840.113549.1.1.12': 'RSA with SHA-384',
  '1.2.840.113549.1.1.13': 'RSA with SHA-512',
};

const KEY_ALG_OIDS: Record<string, string> = {
  '1.2.840.10045.2.1': 'EC',
  '1.2.840.113549.1.1.1': 'RSA',
};

const CURVE_OIDS: Record<string, string> = {
  '1.2.840.10045.3.1.7': 'P-256',
  '1.3.132.0.34': 'P-384',
  '1.3.132.0.35': 'P-521',
};

class DERReader {
  private data: Uint8Array;
  private pos: number;

  constructor(data: Uint8Array) {
    this.data = data;
    this.pos = 0;
  }

  get position() {
    return this.pos;
  }

  get remaining() {
    return this.data.length - this.pos;
  }

  seek(pos: number) {
    this.pos = pos;
  }

  peek(): number {
    return this.data[this.pos];
  }

  readByte(): number {
    return this.data[this.pos++];
  }

  readLength(): number {
    let len = this.readByte();
    if (!(len & 0x80)) return len;
    const numBytes = len & 0x7f;
    len = 0;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | this.readByte();
    }
    return len;
  }

  readTLV(): { tag: number; contents: Uint8Array; end: number } {
    const tag = this.readByte();
    const length = this.readLength();
    const start = this.pos;
    const contents = this.data.slice(start, start + length);
    this.pos = start + length;
    return { tag, contents, end: this.pos };
  }

  // Read an OID and return its dotted string
  readOID(bytes: Uint8Array): string {
    const parts: number[] = [];
    parts.push(Math.floor(bytes[0] / 40));
    parts.push(bytes[0] % 40);
    let value = 0;
    for (let i = 1; i < bytes.length; i++) {
      value = (value << 7) | (bytes[i] & 0x7f);
      if (!(bytes[i] & 0x80)) {
        parts.push(value);
        value = 0;
      }
    }
    return parts.join('.');
  }

  readStringValue(contents: Uint8Array): string {
    return new TextDecoder().decode(contents);
  }

  readInteger(contents: Uint8Array): string {
    return Array.from(contents)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase();
  }

  readTime(tag: number, contents: Uint8Array): string {
    const s = this.readStringValue(contents);
    if (tag === 0x17) {
      // UTCTime: YYMMDDHHMMSSZ
      const year = parseInt(s.slice(0, 2), 10);
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      return `${fullYear}-${s.slice(2, 4)}-${s.slice(4, 6)} ${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)} UTC`;
    }
    if (tag === 0x18) {
      // GeneralizedTime: YYYYMMDDHHMMSSZ
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)} UTC`;
    }
    return s;
  }

  // Parse a Name (issuer/subject) - returns { CN: '...', O: '...', C: '...' }
  parseName(contents: Uint8Array): Record<string, string> {
    const result: Record<string, string> = {};
    const r = new DERReader(contents);
    while (r.remaining > 0) {
      const set = r.readTLV(); // SET
      const setReader = new DERReader(set.contents);
      while (setReader.remaining > 0) {
        const seq = setReader.readTLV(); // SEQUENCE
        const atvReader = new DERReader(seq.contents);
        const oidTlv = atvReader.readTLV(); // OID
        const oid = atvReader.readOID(oidTlv.contents);
        const valTlv = atvReader.readTLV(); // value (string)
        const name = OID_NAMES[oid] || oid;
        result[name] = atvReader.readStringValue(valTlv.contents);
      }
    }
    return result;
  }
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeX509(pem: string): DecodedX509 | null {
  try {
    const der = pemToDer(pem);
    const r = new DERReader(der);

    // Certificate SEQUENCE
    const cert = r.readTLV();
    const certReader = new DERReader(cert.contents);

    // TBSCertificate SEQUENCE
    const tbs = certReader.readTLV();
    const tbsReader = new DERReader(tbs.contents);

    // version [0] EXPLICIT (optional, context tag 0xA0)
    let next = tbsReader.peek();
    if (next === 0xa0) {
      tbsReader.readTLV(); // skip version wrapper
    }

    // serialNumber INTEGER
    const serialTlv = tbsReader.readTLV();
    const serialNumber = Array.from(serialTlv.contents)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase();

    // signature AlgorithmIdentifier SEQUENCE
    const sigAlgTlv = tbsReader.readTLV();
    const sigAlgReader = new DERReader(sigAlgTlv.contents);
    const sigOidTlv = sigAlgReader.readTLV();
    const sigOid = sigAlgReader.readOID(sigOidTlv.contents);
    const signatureAlgorithm = SIG_ALG_OIDS[sigOid] || sigOid;

    // issuer Name SEQUENCE
    const issuerTlv = tbsReader.readTLV();
    const issuer = tbsReader.parseName(issuerTlv.contents);

    // validity SEQUENCE
    const validityTlv = tbsReader.readTLV();
    const valReader = new DERReader(validityTlv.contents);
    const notBeforeTlv = valReader.readTLV();
    const notBefore = valReader.readTime(notBeforeTlv.tag, notBeforeTlv.contents);
    const notAfterTlv = valReader.readTLV();
    const notAfter = valReader.readTime(notAfterTlv.tag, notAfterTlv.contents);

    // subject Name SEQUENCE
    const subjectTlv = tbsReader.readTLV();
    const subject = tbsReader.parseName(subjectTlv.contents);

    // subjectPublicKeyInfo SEQUENCE
    const spkiTlv = tbsReader.readTLV();
    const spkiReader = new DERReader(spkiTlv.contents);
    const keyAlgSeq = spkiReader.readTLV();
    const keyAlgReader = new DERReader(keyAlgSeq.contents);
    const keyOidTlv = keyAlgReader.readTLV();
    const keyOid = keyAlgReader.readOID(keyOidTlv.contents);
    let publicKeyAlgorithm = KEY_ALG_OIDS[keyOid] || keyOid;
    // If EC, try to read curve OID
    if (publicKeyAlgorithm === 'EC' && keyAlgReader.remaining > 0) {
      const curveOidTlv = keyAlgReader.readTLV();
      const curveOid = keyAlgReader.readOID(curveOidTlv.contents);
      const curve = CURVE_OIDS[curveOid] || curveOid;
      publicKeyAlgorithm = `EC ${curve}`;
    }

    // Parse extensions (SAN, CRL DP) from [3] EXPLICIT
    const sanDns: string[] = [];
    const crlDistributionPoints: string[] = [];

    // Check for extensions tag [3] (0xA3)
    while (tbsReader.remaining > 0) {
      const nextTag = tbsReader.peek();
      if (nextTag === 0xa3) {
        const extWrapper = tbsReader.readTLV();
        const extSeqReader = new DERReader(extWrapper.contents);
        const extSeq = extSeqReader.readTLV(); // SEQUENCE of extensions
        const extsReader = new DERReader(extSeq.contents);
        while (extsReader.remaining > 0) {
          const ext = extsReader.readTLV(); // SEQUENCE (one extension)
          const extReader = new DERReader(ext.contents);
          const extOidTlv = extReader.readTLV();
          const extOid = extReader.readOID(extOidTlv.contents);

          // Skip critical boolean if present
          if (extReader.remaining > 0 && extReader.peek() === 0x01) {
            extReader.readTLV();
          }

          if (extReader.remaining > 0) {
            const extValueTlv = extReader.readTLV(); // OCTET STRING wrapping

            // SAN: 2.5.29.17
            if (extOid === '2.5.29.17') {
              try {
                const sanReader = new DERReader(extValueTlv.contents);
                const sanSeq = sanReader.readTLV(); // SEQUENCE of GeneralNames
                const sanSeqReader = new DERReader(sanSeq.contents);
                while (sanSeqReader.remaining > 0) {
                  const gn = sanSeqReader.readTLV();
                  // context tag [2] = dNSName
                  if (gn.tag === 0x82) {
                    sanDns.push(new TextDecoder().decode(gn.contents));
                  }
                }
              } catch { /* skip */ }
            }

            // CRL Distribution Points: 2.5.29.31
            if (extOid === '2.5.29.31') {
              try {
                // Walk through to find URI strings (tag 0x86 = uniformResourceIdentifier)
                const raw = extValueTlv.contents;
                for (let i = 0; i < raw.length - 1; i++) {
                  if (raw[i] === 0x86) {
                    const uriLen = raw[i + 1];
                    if (i + 2 + uriLen <= raw.length) {
                      crlDistributionPoints.push(
                        new TextDecoder().decode(raw.slice(i + 2, i + 2 + uriLen)),
                      );
                      i += 1 + uriLen;
                    }
                  }
                }
              } catch { /* skip */ }
            }
          }
        }
        break;
      } else {
        tbsReader.readTLV(); // skip other fields (issuerUniqueID, subjectUniqueID)
      }
    }

    return {
      serialNumber,
      subject,
      issuer,
      notBefore,
      notAfter,
      signatureAlgorithm,
      publicKeyAlgorithm,
      sanDns,
      crlDistributionPoints,
    };
  } catch {
    return null;
  }
}
