const BASE =
  import.meta.env.VITE_API_BASE ?? 'https://dev.api.hopae.com/registrar';

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

async function requestJWT(url: string): Promise<string> {
  const res = await fetch(BASE + url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.text();
}

// ============================================================
// 1. Public Registry
// ============================================================

export async function listWRPs(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const jws = await requestJWT(`/registry/wrp${qs}`);
  return decodeJWSPayload<{ items: any[]; nextCursor?: string; total: number }>(
    jws,
  );
}

export async function getWRP(id: string) {
  const jws = await requestJWT(`/registry/wrp/${id}`);
  return decodeJWSPayload<any>(jws);
}

export function listAccessCerts(rpId: string) {
  return request<any[]>(`/registry/wrp/${rpId}/access-certs`);
}

export function getAccessCert(rpId: string, certId: string) {
  return request<any>(`/registry/wrp/${rpId}/access-certs/${certId}`);
}

export function listRegistrationCerts(rpId: string) {
  return request<any[]>(`/registry/wrp/${rpId}/registration-certs`);
}

export function getRegistrationCert(rpId: string, certId: string) {
  return request<any>(`/registry/wrp/${rpId}/registration-certs/${certId}`);
}

// ============================================================
// 2. WRP Portal
// ============================================================

export function getMyWRPs(token: string) {
  return request<any[]>('/portal/wrp/my', { headers: authHeaders(token) });
}

export function createWRP(token: string, dto: any) {
  return request<any>('/portal/wrp', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
}

export function updateWRP(token: string, id: string, dto: any) {
  return request<any>(`/portal/wrp/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
}

export function deleteWRP(token: string, id: string) {
  return request<void>(`/portal/wrp/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function createAccessCertForWRP(
  token: string,
  rpId: string,
  dto: { publicKey: string; dns?: string[] },
) {
  return request<{ id: string; crt: string }>(
    `/portal/wrp/${rpId}/access-certs`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ ...dto, rpId }),
    },
  );
}

export function revokeAccessCertForWRP(
  token: string,
  rpId: string,
  certId: string,
) {
  return request<any>(`/portal/wrp/${rpId}/access-certs/${certId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function createRegistrationCertForWRP(
  token: string,
  rpId: string,
  dto: any,
) {
  return request<{ id: string; jwt: string; intendedUse: any }>(
    `/portal/wrp/${rpId}/registration-certs`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(dto),
    },
  );
}

export function revokeRegistrationCertForWRP(
  token: string,
  rpId: string,
  certId: string,
) {
  return request<any>(`/portal/wrp/${rpId}/registration-certs/${certId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// ============================================================
// 3. Intermediary Portal
// ============================================================

export function getMyIntermediaries(token: string) {
  return request<any[]>('/portal/intermediary/my', {
    headers: authHeaders(token),
  });
}

export function registerIntermediary(token: string, dto: any) {
  return request<any>('/portal/intermediary', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
}

export function updateIntermediary(token: string, id: string, dto: any) {
  return request<any>(`/portal/intermediary/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
}

export function deleteIntermediary(token: string, id: string) {
  return request<void>(`/portal/intermediary/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// Intermediary's own access certs
export function createIntermediaryAccessCert(
  token: string,
  intermediaryId: string,
  dto: { publicKey: string; dns?: string[] },
) {
  return request<{ id: string; crt: string }>(
    `/portal/intermediary/${intermediaryId}/access-certs`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ ...dto, rpId: intermediaryId }),
    },
  );
}

export function listIntermediaryAccessCerts(
  token: string,
  intermediaryId: string,
) {
  return request<any[]>(`/portal/intermediary/${intermediaryId}/access-certs`, {
    headers: authHeaders(token),
  });
}

export function revokeIntermediaryAccessCert(
  token: string,
  intermediaryId: string,
  certId: string,
) {
  return request<any>(
    `/portal/intermediary/${intermediaryId}/access-certs/${certId}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
}

// Mediated RPs
export function listMediatedRPs(token: string, intermediaryId: string) {
  return request<any[]>(`/portal/intermediary/${intermediaryId}/mediated-rps`, {
    headers: authHeaders(token),
  });
}

export function registerMediatedRP(
  token: string,
  intermediaryId: string,
  dto: any,
) {
  return request<any>(`/portal/intermediary/${intermediaryId}/mediated-rps`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(dto),
  });
}

export function updateMediatedRP(
  token: string,
  intermediaryId: string,
  rpId: string,
  dto: any,
) {
  return request<any>(
    `/portal/intermediary/${intermediaryId}/mediated-rps/${rpId}`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(dto),
    },
  );
}

export function deleteMediatedRP(
  token: string,
  intermediaryId: string,
  rpId: string,
) {
  return request<void>(
    `/portal/intermediary/${intermediaryId}/mediated-rps/${rpId}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
}

// Mediated RP registration certs
export function listMediatedRPRegCerts(
  token: string,
  intermediaryId: string,
  rpId: string,
) {
  return request<any[]>(
    `/portal/intermediary/${intermediaryId}/mediated-rps/${rpId}/registration-certs`,
    { headers: authHeaders(token) },
  );
}

export function createMediatedRPRegCert(
  token: string,
  intermediaryId: string,
  rpId: string,
  dto: any,
) {
  return request<{ id: string; jwt: string; intendedUse: any }>(
    `/portal/intermediary/${intermediaryId}/mediated-rps/${rpId}/registration-certs`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(dto),
    },
  );
}

export function revokeMediatedRPRegCert(
  token: string,
  intermediaryId: string,
  rpId: string,
  certId: string,
) {
  return request<any>(
    `/portal/intermediary/${intermediaryId}/mediated-rps/${rpId}/registration-certs/${certId}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
}

// ============================================================
// Utility
// ============================================================

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
