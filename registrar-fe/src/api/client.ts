const BASE = 'https://registrar-api.dev.hopae.app';

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export function signIn(email: string, password: string) {
  return request<{ access_token: string }>('/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function signUp(
  email: string,
  password: string,
  name: string,
  company: string,
) {
  return request<{ access_token: string }>('/auth/sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, company }),
  });
}

// JWS helpers
function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded);
}

function decodeJWSPayload<T>(jws: string): T {
  const parts = jws.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWS format');
  return JSON.parse(base64UrlDecode(parts[1]));
}

// WRP public (JWS-signed responses with Content-Type: application/jwt)
async function requestJWT(url: string): Promise<string> {
  const res = await fetch(BASE + url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.text();
}

export async function listWRPs(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const jws = await requestJWT(`/wrp${qs}`);
  return decodeJWSPayload<{ items: any[]; nextCursor?: string; total: number }>(
    jws,
  );
}

export async function getWRP(id: string) {
  const jws = await requestJWT(`/wrp/${id}`);
  return decodeJWSPayload<any>(jws);
}

// WRP authenticated
export function getMyWRPs(token: string) {
  return request<any[]>('/wrp/my', { headers: authHeaders(token) });
}

export function createWRP(token: string, dto: any) {
  return request<any>('/wrp', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
}

export function deleteWRP(token: string, id: string) {
  return request<void>(`/wrp/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Access certificates
export function listAccessCerts(rpId: string) {
  return request<any[]>(`/wrp/${rpId}/access-certs`);
}

export function createAccessCert(
  token: string,
  rpId: string,
  dto: { publicKey: string; dns?: string[] },
) {
  return request<{ id: string; crt: string }>(`/wrp/${rpId}/access-certs`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ ...dto, rpId }),
  });
}

export function revokeAccessCert(token: string, rpId: string, certId: string) {
  return request<any>(`/wrp/${rpId}/access-certs/${certId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Registration certificates
export function listRegistrationCerts(rpId: string) {
  return request<any[]>(`/wrp/${rpId}/registration-certs`);
}

export function createRegistrationCert(token: string, rpId: string, dto: any) {
  return request<{ id: string; jwt: string; intendedUse: any }>(
    `/wrp/${rpId}/registration-certs`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(dto),
    },
  );
}

export function revokeRegistrationCert(
  token: string,
  rpId: string,
  certId: string,
) {
  return request<any>(`/wrp/${rpId}/registration-certs/${certId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Utility: generate EC P-256 key pair in browser
export async function generateECP256KeyPair(): Promise<string> {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const spki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
  const lines = b64.match(/.{1,64}/g)!;
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}
