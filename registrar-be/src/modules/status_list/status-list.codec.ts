import { deflateSync } from 'node:zlib';

// IETF Token Status List (draft-ietf-oauth-status-list) bitstring codec.
// Ported verbatim from the issuer / wallet-provider services so all three encode identically.

export const STATUS_LIST_ID = '1';

/** Status Type values (IETF Token Status List §7.1). */
export const STATUS_VALID = 0x00;
export const STATUS_INVALID = 0x01; // revoked

export type StatusBits = 1 | 2 | 4 | 8;

/** IETF Token Status List §4.2 `StatusList` object. */
export interface StatusList {
  bits: number;
  lst: string;
}

export function encodeStatusList(
  entries: ReadonlyArray<{ idx: number; status: number }>,
  bits: StatusBits = 1,
  minEntries = 0,
): StatusList {
  const entriesPerByte = 8 / bits;
  const mask = (1 << bits) - 1;
  const maxIdx = entries.reduce((m, e) => Math.max(m, e.idx), -1);
  const totalEntries = Math.max(maxIdx + 1, minEntries);
  const byteLength = Math.max(Math.ceil(totalEntries / entriesPerByte), 1);
  const bytes = new Uint8Array(byteLength);
  for (const { idx, status } of entries) {
    const byteIndex = Math.floor(idx / entriesPerByte);
    const shift = (idx % entriesPerByte) * bits;
    bytes[byteIndex] |= (status & mask) << shift;
  }
  return { bits, lst: base64url(deflateSync(bytes, { level: 9 })) };
}

export function statusListUri(
  issuer: string,
  id: string = STATUS_LIST_ID,
): string {
  return `${issuer}/status-lists/${id}`;
}

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
