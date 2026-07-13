import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getWRP,
  listAccessCerts,
  listRegistrationCerts,
  createAccessCertForWRP as createAccessCert,
  createRegistrationCertForWRP as createRegistrationCert,
  revokeAccessCertForWRP as revokeAccessCert,
  revokeRegistrationCertForWRP as revokeRegistrationCert,
  deleteWRP,
  generateECP256KeyPair,
} from '../api/client';
import { registrationCertPreset, accessCertPreset, credentialPresets } from '../presets/data';
import { decodeX509, decodeJWT } from '../utils/certDecode';
import { ArrowLeft, Plus, Trash2, RefreshCw, ShieldCheck, FileText, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

function formatDN(dn: Record<string, string>): string {
  const order = ['CN', 'O', 'organizationIdentifier', 'OU', 'C'];
  const parts: string[] = [];
  for (const key of order) {
    if (dn[key]) parts.push(`${key}=${dn[key]}`);
  }
  // Add any remaining keys not in the order list
  for (const [key, val] of Object.entries(dn)) {
    if (!order.includes(key)) parts.push(`${key}=${val}`);
  }
  return parts.join(', ');
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 text-sm break-all', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  );
}

function X509DecodedView({ pem }: { pem: string }) {
  const decoded = useMemo(() => decodeX509(pem), [pem]);
  if (!decoded) return <p className="text-sm text-destructive">Unable to decode certificate</p>;
  return (
    <dl className="divide-y divide-border rounded-md border border-border px-4">
      <DetailRow label="Subject" value={formatDN(decoded.subject)} />
      <DetailRow label="Issuer" value={formatDN(decoded.issuer)} />
      <DetailRow label="Serial Number" value={decoded.serialNumber} mono />
      <DetailRow label="Not Before" value={decoded.notBefore} />
      <DetailRow label="Not After" value={decoded.notAfter} />
      <DetailRow label="Signature Algorithm" value={decoded.signatureAlgorithm} />
      <DetailRow label="Public Key" value={decoded.publicKeyAlgorithm} />
      {decoded.sanDns.length > 0 && (
        <DetailRow label="SAN (DNS)" value={decoded.sanDns.join(', ')} />
      )}
      {decoded.crlDistributionPoints.length > 0 && (
        <DetailRow label="CRL Distribution" value={decoded.crlDistributionPoints.join(', ')} mono />
      )}
    </dl>
  );
}

function JWTDecodedView({ jwt }: { jwt: string }) {
  const decoded = useMemo(() => decodeJWT(jwt), [jwt]);
  if (!decoded) return <p className="text-sm text-destructive">Unable to decode JWT</p>;

  const { header, payload } = decoded;

  // Pick out key display fields
  const headerSummary = `alg=${header.alg}, typ=${header.typ}`;
  const hasX5c = Array.isArray(header.x5c) && header.x5c.length > 0;

  return (
    <dl className="divide-y divide-border rounded-md border border-border px-4">
      <DetailRow
        label="Header"
        value={`${headerSummary}${hasX5c ? `, x5c[${header.x5c.length}]` : ''}`}
        mono
      />
      {payload.iss && <DetailRow label="Issuer (iss)" value={payload.iss} />}
      {payload.sub && <DetailRow label="Subject (sub)" value={payload.sub} mono />}
      {payload.jti && <DetailRow label="JWT ID (jti)" value={payload.jti} mono />}
      {payload.iat && (
        <DetailRow label="Issued At" value={new Date(payload.iat * 1000).toISOString()} />
      )}
      {payload.name && <DetailRow label="Name" value={payload.name} />}
      {payload.legal_name && <DetailRow label="Legal Name" value={payload.legal_name} />}
      {payload.country && <DetailRow label="Country" value={payload.country} />}
      {payload.registry_uri && <DetailRow label="Registry URI" value={payload.registry_uri} mono />}
      {payload.entitlements && (
        <DetailRow
          label="Entitlements"
          value={(Array.isArray(payload.entitlements) ? payload.entitlements : [payload.entitlements])
            .map((e: string) => e.split('/').pop())
            .join(', ')}
        />
      )}
      {payload.support_uri && <DetailRow label="Support URI" value={payload.support_uri} />}
      {payload.privacy_policy && (
        <DetailRow label="Privacy Policy" value={payload.privacy_policy} />
      )}
      {payload.isPSB !== undefined && <DetailRow label="Is PSB" value={String(payload.isPSB)} />}
      {payload.intermediary && (
        <DetailRow
          label="Intermediary"
          value={`${payload.intermediary.sname} (${payload.intermediary.sub})`}
        />
      )}
      {payload.dpa && (
        <DetailRow
          label="DPA"
          value={[payload.dpa.uri, payload.dpa.email, payload.dpa.phone].filter(Boolean).join(' | ')}
        />
      )}
      {payload.purpose && (
        <DetailRow
          label="Purpose"
          value={
            Array.isArray(payload.purpose)
              ? payload.purpose.map((p: any) => p.content || p).join('; ')
              : String(payload.purpose)
          }
        />
      )}
      {payload.srvDescription && (
        <DetailRow
          label="Service Description"
          value={
            Array.isArray(payload.srvDescription)
              ? payload.srvDescription.map((d: any) => d.content || d).join('; ')
              : String(payload.srvDescription)
          }
        />
      )}
    </dl>
  );
}

export default function RPDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [rp, setRp] = useState<any>(null);
  const [accessCerts, setAccessCerts] = useState<any[]>([]);
  const [regCerts, setRegCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [expandedCert, setExpandedCert] = useState<string | null>(null);

  // Access cert form
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessDns, setAccessDns] = useState(accessCertPreset.dns.join(', '));
  const [accessPubKey, setAccessPubKey] = useState('');

  // Registration cert form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regSupportUri, setRegSupportUri] = useState('');
  const [regPrivacyPolicy, setRegPrivacyPolicy] = useState('');
  const [regPurposeLang, setRegPurposeLang] = useState('en');
  const [regPurposeContent, setRegPurposeContent] = useState('');
  const [regCredentials, setRegCredentials] = useState('');
  const [regCredentialCustom, setRegCredentialCustom] = useState(false);
  const [regCredentialPreset, setRegCredentialPreset] = useState<'pid' | 'ageVerification' | 'custom' | null>(null);
  const [regIntermediary, setRegIntermediary] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [rpData, ac, rc] = await Promise.all([
        getWRP(id),
        listAccessCerts(id),
        listRegistrationCerts(id),
      ]);
      setRp(rpData);
      setAccessCerts(ac);
      setRegCerts(rc);
    } catch (err: any) {
      setMessage(`Error loading RP: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openAccessForm = () => {
    setShowAccessForm(true);
    setShowRegForm(false);
    setAccessDns(accessCertPreset.dns.join(', '));
    setAccessPubKey('');
  };

  const prefillAccessForm = async () => {
    setAccessDns(accessCertPreset.dns.join(', '));
    try {
      const key = await generateECP256KeyPair();
      setAccessPubKey(key);
    } catch (err: any) {
      setAccessPubKey(`Error generating key: ${err.message}`);
    }
  };

  const usesIntermediary = rp?.usesIntermediary?.length > 0;

  const fillRegIntermediary = () => {
    const interRef = rp?.usesIntermediary?.[0];
    // Use the intermediary's registered identifier directly — the registryURI is now the absolute
    // registry API base (TS5), not the old `/wrp/{id}` form, so it no longer carries the id.
    return interRef?.identifier?.[0]?.identifier ?? '';
  };

  const openRegForm = () => {
    setShowRegForm(true);
    setShowAccessForm(false);
    setRegSupportUri('');
    setRegPrivacyPolicy('');
    setRegPurposeLang('en');
    setRegPurposeContent('');
    setRegCredentials('');
    setRegCredentialCustom(false);
    setRegCredentialPreset(null);
    setRegIntermediary(fillRegIntermediary());
  };

  const prefillRegForm = () => {
    setRegSupportUri(registrationCertPreset.support_uri);
    setRegPrivacyPolicy(registrationCertPreset.privacy_policy);
    setRegPurposeLang(registrationCertPreset.purpose[0].lang);
    setRegPurposeContent(registrationCertPreset.purpose[0].content);
    setRegCredentials(JSON.stringify(registrationCertPreset.credentials, null, 2));
    setRegCredentialCustom(false);
    setRegCredentialPreset('pid');
    setRegIntermediary(fillRegIntermediary());
  };

  const applyCredentialPreset = (key: 'pid' | 'ageVerification' | 'custom') => {
    setRegCredentialPreset(key);
    if (key === 'custom') {
      setRegCredentials('[\n  \n]');
      setRegCredentialCustom(true);
    } else {
      setRegCredentials(JSON.stringify(credentialPresets[key], null, 2));
      setRegCredentialCustom(false);
    }
  };

  const handleCreateAccessCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setCreating('access');
    setMessage('');
    try {
      const dns = accessDns.split(',').map((s) => s.trim()).filter(Boolean);
      await createAccessCert(token, id, {
        publicKey: accessPubKey,
        dns: dns.length > 0 ? dns : undefined,
      });
      setMessage('Access certificate created successfully!');
      setShowAccessForm(false);
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setCreating(null);
    }
  };

  const handleCreateRegCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setCreating('registration');
    setMessage('');
    try {
      let credentials: any[];
      try {
        credentials = JSON.parse(regCredentials);
      } catch {
        credentials = [];
      }
      const dto: any = {
        support_uri: regSupportUri,
        privacy_policy: regPrivacyPolicy,
        purpose: [{ lang: regPurposeLang, content: regPurposeContent }],
        credentials,
      };
      if (regIntermediary.trim()) {
        dto.intermediary = regIntermediary.trim();
      }
      await createRegistrationCert(token, id, dto);
      setMessage('Registration certificate created successfully!');
      setShowRegForm(false);
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setCreating(null);
    }
  };

  const handleRevokeAccessCert = async (certId: string) => {
    if (!token || !id) return;
    setMessage('');
    try {
      await revokeAccessCert(token, id, certId);
      setMessage('Access certificate revoked.');
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleRevokeRegCert = async (certId: string) => {
    if (!token || !id) return;
    setMessage('');
    try {
      await revokeRegistrationCert(token, id, certId);
      setMessage('Registration certificate revoked.');
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!token || !id) return;
    if (!confirm('Delete this relying party?')) return;
    try {
      await deleteWRP(token, id);
      navigate('/dashboard');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const backLink = (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to Dashboard
    </Link>
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {backLink}
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!rp) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {backLink}
        <p className="mt-8 text-sm text-muted-foreground">Relying party not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {backLink}

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {rp.tradeName || rp.legalName}
          </h1>
          {rp.legalName && rp.tradeName && (
            <p className="text-sm text-muted-foreground">{rp.legalName}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {rp.isIntermediary && <Badge variant="secondary">Intermediary</Badge>}
            {rp.isPSB && <Badge variant="success">PSB</Badge>}
            {rp.usesIntermediary?.length > 0 && <Badge variant="outline">Uses Intermediary</Badge>}
          </div>
        </div>
        {token && (
          <div className="shrink-0">
            <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Delete RP
            </Button>
          </div>
        )}
      </div>

      {message && (
        <Alert
          variant={message.startsWith('Error') ? 'destructive' : 'success'}
          className="mt-6"
        >
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="mt-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="overview">
              <FileText className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="access">
              <ShieldCheck className="size-4" />
              Access Certs
              <Badge variant="secondary" className="ml-1">
                {accessCerts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="registration">
              <KeyRound className="size-4" />
              Registration Certs
              <Badge variant="secondary" className="ml-1">
                {regCerts.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ---------------- Overview ---------------- */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* RP Info */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DetailRow label="Registry URI" value={rp.registryURI} mono />
                <DetailRow
                  label="Identifiers"
                  value={
                    <span className="flex flex-col gap-0.5">
                      {rp.identifier?.map((id: any, i: number) => (
                        <span key={i}>
                          {id.type}: {id.value}
                        </span>
                      ))}
                    </span>
                  }
                />
                <DetailRow label="Email" value={rp.email || '-'} />
                <DetailRow label="Phone" value={rp.phone || '-'} />
                <DetailRow label="Support" value={rp.supportURI?.join(', ') || '-'} />
                <DetailRow label="Description" value={rp.srvDescription?.[0]?.content || '-'} />
                <DetailRow
                  label="Entitlements"
                  value={rp.entitlement?.map((e: string) => e.split('/').pop()).join(', ') || '-'}
                />
                <DetailRow
                  label="Supervisory Authority"
                  value={rp.supervisoryAuthority?.legalName || '-'}
                />
                {rp.usesIntermediary?.length > 0 && (
                  <DetailRow
                    label="Intermediary"
                    value={
                      <span className="flex flex-col gap-0.5">
                        {rp.usesIntermediary.map((inter: any, i: number) => (
                          <span key={i}>
                            {inter.tradeName} ({inter.identifier?.[0]?.identifier})
                          </span>
                        ))}
                      </span>
                    }
                  />
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Intended Use */}
          {rp.intendedUse?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Intended Uses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rp.intendedUse.map((iu: any, i: number) => (
                  <div
                    key={i}
                    className="space-y-1 rounded-lg border border-border p-4 text-sm"
                  >
                    <p className="break-words">
                      <span className="font-medium">Purpose:</span> {iu.purpose?.[0]?.content}
                    </p>
                    <p className="break-all">
                      <span className="font-medium">Privacy Policy:</span>{' '}
                      {iu.privacyPolicy?.[0]?.policyURI}
                    </p>
                    <p className="break-words">
                      <span className="font-medium">Credentials:</span>{' '}
                      {iu.credential?.map((c: any) => c.format).join(', ')}
                    </p>
                    {iu.intendedUseIdentifier && (
                      <p className="font-mono text-xs text-muted-foreground break-all">
                        ID: {iu.intendedUseIdentifier}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------- Access Certificates ---------------- */}
        <TabsContent value="access" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Access Certificates</h2>
              <p className="text-sm text-muted-foreground">
                {usesIntermediary
                  ? 'Access certificates are managed by your intermediary.'
                  : 'X.509 certificates for mTLS access. A fresh EC P-256 key pair is generated for each certificate.'}
              </p>
            </div>
            {token && (
              <Button
                className="w-full shrink-0 sm:w-auto"
                onClick={showAccessForm ? () => setShowAccessForm(false) : openAccessForm}
                disabled={creating !== null || usesIntermediary}
              >
                {showAccessForm ? (
                  'Cancel'
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create Access Cert
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Access Cert Form */}
          {showAccessForm && (
            <form
              className="rounded-xl border border-border bg-card shadow-sm"
              onSubmit={handleCreateAccessCert}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-6 py-4">
                <h3 className="font-semibold">Create Access Certificate</h3>
                <Button type="button" variant="ghost" size="sm" onClick={prefillAccessForm}>
                  <RefreshCw className="size-4" />
                  Prefill
                </Button>
              </div>
              <div className="space-y-4 p-6">
                <div className="space-y-2">
                  <Label htmlFor="accessDns">DNS Entries (comma-separated)</Label>
                  <Input
                    id="accessDns"
                    value={accessDns}
                    onChange={(e) => setAccessDns(e.target.value)}
                    placeholder="verify.hopae.com, api.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessPubKey">Public Key (EC P-256 PEM)</Label>
                  <Textarea
                    id="accessPubKey"
                    className="font-mono text-xs"
                    value={accessPubKey}
                    onChange={(e) => setAccessPubKey(e.target.value)}
                    rows={5}
                    placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowAccessForm(false)}
                  disabled={creating !== null}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={creating !== null || !accessPubKey}
                >
                  {creating === 'access' ? 'Creating...' : 'Create Certificate'}
                </Button>
              </div>
            </form>
          )}

          {accessCerts.length === 0 && !showAccessForm ? (
            <p className="text-sm text-muted-foreground">No access certificates.</p>
          ) : (
            <div className="space-y-4">
              {accessCerts.map((cert: any) => (
                <Card
                  key={cert.id}
                  className={cn(cert.revokedAt && 'border-destructive/30 bg-muted/30')}
                >
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs break-all">Serial: {cert.id}</span>
                        {cert.revokedAt ? (
                          <Badge variant="destructive">Revoked</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() =>
                            setExpandedCert(expandedCert === cert.id ? null : cert.id)
                          }
                        >
                          {expandedCert === cert.id ? 'Hide' : 'Show'} Raw PEM
                        </Button>
                        {token && !cert.revokedAt && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => handleRevokeAccessCert(cert.id)}
                          >
                            <Trash2 className="size-4" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                      {cert.dns?.length > 0 && <span>DNS: {cert.dns.join(', ')}</span>}
                    </div>
                    {/* Decoded X.509 info */}
                    {cert.certificate && <X509DecodedView pem={cert.certificate} />}
                    {expandedCert === cert.id && (
                      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">
                        {cert.certificate}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- Registration Certificates ---------------- */}
        <TabsContent value="registration" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Registration Certificates</h2>
              <p className="text-sm text-muted-foreground">
                JWT-based registration certificates (rc-wrp+jwt) signed with ES256.
              </p>
            </div>
            {token && (
              <Button
                className="w-full shrink-0 sm:w-auto"
                onClick={showRegForm ? () => setShowRegForm(false) : openRegForm}
                disabled={creating !== null}
              >
                {showRegForm ? (
                  'Cancel'
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create Registration Cert
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Registration Cert Form */}
          {showRegForm && (
            <form
              className="rounded-xl border border-border bg-card shadow-sm"
              onSubmit={handleCreateRegCert}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-6 py-4">
                <h3 className="font-semibold">Create Registration Certificate</h3>
                <Button type="button" variant="ghost" size="sm" onClick={prefillRegForm}>
                  <RefreshCw className="size-4" />
                  Prefill
                </Button>
              </div>
              <div className="space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="regSupportUri">Support URI</Label>
                    <Input
                      id="regSupportUri"
                      value={regSupportUri}
                      onChange={(e) => setRegSupportUri(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regPrivacyPolicy">Privacy Policy URI</Label>
                    <Input
                      id="regPrivacyPolicy"
                      value={regPrivacyPolicy}
                      onChange={(e) => setRegPrivacyPolicy(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Purpose</h4>
                  <div className="mt-2 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="regPurposeLang">Language</Label>
                      <Input
                        id="regPurposeLang"
                        value={regPurposeLang}
                        onChange={(e) => setRegPurposeLang(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regPurposeContent">Content</Label>
                      <Input
                        id="regPurposeContent"
                        value={regPurposeContent}
                        onChange={(e) => setRegPurposeContent(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">Credentials</h4>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      className={cn(
                        'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                        regCredentialPreset === 'pid'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border',
                      )}
                      onClick={() => applyCredentialPreset('pid')}
                    >
                      <span className="text-sm font-medium">PID</span>
                      <span className="text-xs text-muted-foreground">
                        Name, birth date, address
                      </span>
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                        regCredentialPreset === 'ageVerification'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border',
                      )}
                      onClick={() => applyCredentialPreset('ageVerification')}
                    >
                      <span className="text-sm font-medium">Age Verification</span>
                      <span className="text-xs text-muted-foreground">Age over 18 check</span>
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                        regCredentialPreset === 'custom'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border',
                      )}
                      onClick={() => applyCredentialPreset('custom')}
                    >
                      <span className="text-sm font-medium">Custom</span>
                      <span className="text-xs text-muted-foreground">Define your own claims</span>
                    </button>
                  </div>
                  <Textarea
                    className="mt-2 min-h-40 font-mono text-xs"
                    value={regCredentials}
                    onChange={(e) => setRegCredentials(e.target.value)}
                    readOnly={!regCredentialCustom}
                  />
                </div>

                {usesIntermediary && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">Intermediary</h4>
                    <div className="mt-2 space-y-2">
                      <Label htmlFor="regIntermediary">Intermediary RP ID</Label>
                      <Input id="regIntermediary" value={regIntermediary} readOnly />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowRegForm(false)}
                  disabled={creating !== null}
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={creating !== null}>
                  {creating === 'registration' ? 'Creating...' : 'Create Certificate'}
                </Button>
              </div>
            </form>
          )}

          {regCerts.length === 0 && !showRegForm ? (
            <p className="text-sm text-muted-foreground">No registration certificates.</p>
          ) : (
            <div className="space-y-4">
              {regCerts.map((cert: any) => (
                <Card
                  key={cert.id}
                  className={cn(cert.revokedAt && 'border-destructive/30 bg-muted/30')}
                >
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs break-all">ID: {cert.id}</span>
                        {cert.revokedAt ? (
                          <Badge variant="destructive">Revoked</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() =>
                            setExpandedCert(
                              expandedCert === `reg-${cert.id}` ? null : `reg-${cert.id}`,
                            )
                          }
                        >
                          {expandedCert === `reg-${cert.id}` ? 'Hide' : 'Show'} Raw JWT
                        </Button>
                        {token && !cert.revokedAt && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => handleRevokeRegCert(cert.id)}
                          >
                            <Trash2 className="size-4" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                    </div>
                    {/* Decoded JWT info */}
                    {cert.jwt && <JWTDecodedView jwt={cert.jwt} />}
                    {expandedCert === `reg-${cert.id}` && (
                      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">
                        {cert.jwt}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
