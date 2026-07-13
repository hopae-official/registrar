import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getWRP,
  listMediatedRPRegCerts,
  createMediatedRPRegCert,
  revokeMediatedRPRegCert,
  deleteMediatedRP,
} from '../../api/client';
import { registrationCertPreset, credentialPresets } from '../../presets/data';
import { decodeJWT } from '../../utils/certDecode';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{value}</dd>
    </div>
  );
}

function DecodedRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid gap-1 px-3 py-2 sm:grid-cols-[160px_1fr] sm:gap-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('text-xs break-all', mono && 'font-mono')}>{value}</dd>
    </div>
  );
}

function JWTDecodedView({ jwt }: { jwt: string }) {
  const decoded = useMemo(() => decodeJWT(jwt), [jwt]);
  if (!decoded) return <p className="text-sm text-destructive">Unable to decode JWT</p>;

  const { header, payload } = decoded;
  const headerSummary = `alg=${header.alg}, typ=${header.typ}`;
  const hasX5c = Array.isArray(header.x5c) && header.x5c.length > 0;

  return (
    <dl className="divide-y divide-border rounded-md border border-border bg-muted/30">
      <DecodedRow label="Header" value={`${headerSummary}${hasX5c ? `, x5c[${header.x5c.length}]` : ''}`} mono />
      {payload.iss && <DecodedRow label="Issuer (iss)" value={payload.iss} />}
      {payload.sub && <DecodedRow label="Subject (sub)" value={payload.sub} mono />}
      {payload.jti && <DecodedRow label="JWT ID (jti)" value={payload.jti} mono />}
      {payload.iat && <DecodedRow label="Issued At" value={new Date(payload.iat * 1000).toISOString()} />}
      {payload.name && <DecodedRow label="Name" value={payload.name} />}
      {payload.legal_name && <DecodedRow label="Legal Name" value={payload.legal_name} />}
      {payload.country && <DecodedRow label="Country" value={payload.country} />}
      {payload.registry_uri && <DecodedRow label="Registry URI" value={payload.registry_uri} mono />}
      {payload.intermediary && (
        <DecodedRow
          label="Intermediary"
          value={`${payload.intermediary.sname} (${payload.intermediary.sub})`}
        />
      )}
      {payload.entitlements && (
        <DecodedRow
          label="Entitlements"
          value={(Array.isArray(payload.entitlements) ? payload.entitlements : [payload.entitlements])
            .map((e: string) => e.split('/').pop())
            .join(', ')}
        />
      )}
      {payload.support_uri && <DecodedRow label="Support URI" value={payload.support_uri} />}
      {payload.privacy_policy && <DecodedRow label="Privacy Policy" value={payload.privacy_policy} />}
      {payload.purpose && (
        <DecodedRow
          label="Purpose"
          value={
            Array.isArray(payload.purpose)
              ? payload.purpose.map((p: any) => p.content || p).join('; ')
              : String(payload.purpose)
          }
        />
      )}
      {payload.dpa && (
        <DecodedRow
          label="DPA"
          value={[payload.dpa.uri, payload.dpa.email, payload.dpa.phone].filter(Boolean).join(' | ')}
        />
      )}
    </dl>
  );
}

export default function MediatedRPDetail() {
  const { id: intermediaryId, rpId } = useParams<{ id: string; rpId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rp, setRp] = useState<any>(null);
  const [regCerts, setRegCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [expandedCert, setExpandedCert] = useState<string | null>(null);

  // Registration cert form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regSupportUri, setRegSupportUri] = useState('');
  const [regPrivacyPolicy, setRegPrivacyPolicy] = useState('');
  const [regPurposeLang, setRegPurposeLang] = useState('en');
  const [regPurposeContent, setRegPurposeContent] = useState('');
  const [regCredentials, setRegCredentials] = useState('');
  const [regCredentialCustom, setRegCredentialCustom] = useState(false);
  const [regCredentialPreset, setRegCredentialPreset] = useState<'pid' | 'ageVerification' | 'custom' | null>(null);

  const load = useCallback(async () => {
    if (!token || !intermediaryId || !rpId) return;
    setLoading(true);
    try {
      const [rpData, certs] = await Promise.all([
        getWRP(rpId),
        listMediatedRPRegCerts(token, intermediaryId, rpId),
      ]);
      setRp(rpData);
      setRegCerts(certs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, intermediaryId, rpId]);

  useEffect(() => {
    if (!token) { navigate('/sign-in'); return; }
    load();
  }, [token, navigate, load]);

  const openRegForm = () => {
    setShowRegForm(true);
    setRegSupportUri('');
    setRegPrivacyPolicy('');
    setRegPurposeLang('en');
    setRegPurposeContent('');
    setRegCredentials('');
    setRegCredentialCustom(false);
    setRegCredentialPreset(null);
  };

  const prefillRegForm = () => {
    setRegSupportUri(registrationCertPreset.support_uri);
    setRegPrivacyPolicy(registrationCertPreset.privacy_policy);
    setRegPurposeLang(registrationCertPreset.purpose[0].lang);
    setRegPurposeContent(registrationCertPreset.purpose[0].content);
    setRegCredentials(JSON.stringify(registrationCertPreset.credentials, null, 2));
    setRegCredentialCustom(false);
    setRegCredentialPreset('pid');
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

  const handleCreateRegCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !intermediaryId || !rpId) return;
    setCreating('registration');
    setMessage('');
    try {
      let credentials: any[];
      try { credentials = JSON.parse(regCredentials); } catch { credentials = []; }
      const dto = {
        support_uri: regSupportUri,
        privacy_policy: regPrivacyPolicy,
        purpose: [{ lang: regPurposeLang, content: regPurposeContent }],
        credentials,
      };
      await createMediatedRPRegCert(token, intermediaryId, rpId, dto);
      setMessage('Registration certificate created successfully!');
      setShowRegForm(false);
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setCreating(null);
    }
  };

  const handleRevokeRegCert = async (certId: string) => {
    if (!token || !intermediaryId || !rpId) return;
    setMessage('');
    try {
      await revokeMediatedRPRegCert(token, intermediaryId, rpId, certId);
      setMessage('Registration certificate revoked.');
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!token || !intermediaryId || !rpId) return;
    if (!confirm('Delete this mediated RP?')) return;
    try {
      await deleteMediatedRP(token, intermediaryId, rpId);
      navigate(`/dashboard/intermediary/${intermediaryId}`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-40" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }
  if (!rp) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-10 text-center text-sm text-muted-foreground">Mediated RP not found.</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to={`/dashboard/intermediary/${intermediaryId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Intermediary
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{rp.tradeName || rp.legalName}</h1>
            <Badge variant="outline">Mediated RP</Badge>
          </div>
          {rp.legalName && rp.tradeName && <p className="text-sm text-muted-foreground">{rp.legalName}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto">
            <Trash2 className="size-4" />
            Delete RP
          </Button>
        </div>
      </div>

      {message && (
        <Alert variant={message.startsWith('Error') ? 'destructive' : 'success'} className="mt-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="mt-6 gap-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="registration">Registration Certs</TabsTrigger>
        </TabsList>

        {/* Info */}
        <TabsContent value="overview">
          <Card className="p-6">
            <dl className="divide-y divide-border">
              <InfoRow label="Registry URI" value={<span className="break-all">{rp.registryURI}</span>} />
              <InfoRow
                label="Identifiers"
                value={
                  <div className="flex flex-col gap-0.5">
                    {rp.identifier?.map((id: any, i: number) => (
                      <span key={i}>{id.type}: {id.identifier}</span>
                    ))}
                  </div>
                }
              />
              <InfoRow label="Email" value={rp.email || '-'} />
              <InfoRow label="Phone" value={rp.phone || '-'} />
              <InfoRow label="Support" value={rp.supportURI?.join(', ') || '-'} />
              <InfoRow label="Description" value={rp.srvDescription?.[0]?.content || '-'} />
              <InfoRow
                label="Entitlements"
                value={rp.entitlement?.map((e: string) => e.split('/').pop()).join(', ') || '-'}
              />
              <InfoRow label="Supervisory Authority" value={rp.supervisoryAuthority?.legalName || '-'} />
            </dl>
          </Card>
        </TabsContent>

        {/* Registration Certificates (WRPRC) */}
        <TabsContent value="registration" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <FileText className="size-5 text-primary" />
                Registration Certificates (WRPRC)
              </h2>
              <p className="text-sm text-muted-foreground">
                JWT-based registration certificates (rc-wrp+jwt) signed with ES256. The intermediary reference is
                automatically included.
              </p>
            </div>
            <Button
              onClick={showRegForm ? () => setShowRegForm(false) : openRegForm}
              disabled={creating !== null}
              variant={showRegForm ? 'secondary' : 'default'}
              className="w-full sm:w-auto"
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
          </div>

          {showRegForm && (
            <form onSubmit={handleCreateRegCert}>
              <Card className="gap-5 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Create Registration Certificate</h3>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={prefillRegForm}>
                    Prefill
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="reg-support">Support URI</Label>
                    <Input
                      id="reg-support"
                      value={regSupportUri}
                      onChange={(e) => setRegSupportUri(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reg-privacy">Privacy Policy URI</Label>
                    <Input
                      id="reg-privacy"
                      value={regPrivacyPolicy}
                      onChange={(e) => setRegPrivacyPolicy(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium">Purpose</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="reg-purpose-lang">Language</Label>
                      <Input
                        id="reg-purpose-lang"
                        value={regPurposeLang}
                        onChange={(e) => setRegPurposeLang(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reg-purpose-content">Content</Label>
                      <Input
                        id="reg-purpose-content"
                        value={regPurposeContent}
                        onChange={(e) => setRegPurposeContent(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium">Credentials</h4>
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        className={cn(
                          'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50',
                          regCredentialPreset === 'pid' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
                        )}
                        onClick={() => applyCredentialPreset('pid')}
                      >
                        <span className="text-sm font-medium">PID</span>
                        <span className="text-xs text-muted-foreground">Name, birth date, address</span>
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50',
                          regCredentialPreset === 'ageVerification' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
                        )}
                        onClick={() => applyCredentialPreset('ageVerification')}
                      >
                        <span className="text-sm font-medium">Age Verification</span>
                        <span className="text-xs text-muted-foreground">Age over 18 check</span>
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50',
                          regCredentialPreset === 'custom' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
                        )}
                        onClick={() => applyCredentialPreset('custom')}
                      >
                        <span className="text-sm font-medium">Custom</span>
                        <span className="text-xs text-muted-foreground">Define your own claims</span>
                      </button>
                    </div>
                    <Textarea
                      className="min-h-[220px] font-mono text-xs"
                      value={regCredentials}
                      onChange={(e) => setRegCredentials(e.target.value)}
                      readOnly={!regCredentialCustom}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowRegForm(false)}
                    disabled={creating !== null}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating !== null} className="w-full sm:w-auto">
                    {creating === 'registration' ? 'Creating...' : 'Create Certificate'}
                  </Button>
                </div>
              </Card>
            </form>
          )}

          {regCerts.length === 0 && !showRegForm ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">No registration certificates.</Card>
          ) : (
            <div className="space-y-4">
              {regCerts.map((cert: any) => (
                <Card
                  key={cert.id}
                  className={cn('gap-4 p-5', cert.revokedAt && 'border-destructive/40 bg-destructive/5')}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm break-all">ID: {cert.id}</span>
                      {cert.revokedAt && <Badge variant="destructive">Revoked</Badge>}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedCert(expandedCert === `reg-${cert.id}` ? null : `reg-${cert.id}`)}
                        className="w-full sm:w-auto"
                      >
                        {expandedCert === `reg-${cert.id}` ? 'Hide' : 'Show'} Raw JWT
                      </Button>
                      {!cert.revokedAt && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeRegCert(cert.id)}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="size-4" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                  </div>
                  {cert.jwt && <JWTDecodedView jwt={cert.jwt} />}
                  {expandedCert === `reg-${cert.id}` && (
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">{cert.jwt}</pre>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
