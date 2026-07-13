import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getWRP,
  listMediatedRPs,
  listIntermediaryAccessCerts,
  createIntermediaryAccessCert,
  revokeIntermediaryAccessCert,
  deleteIntermediary,
  generateECP256KeyPair,
} from '../../api/client';
import { accessCertPreset } from '../../presets/data';
import { decodeX509 } from '../../utils/certDecode';
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

function formatDN(dn: Record<string, string>): string {
  const order = ['CN', 'O', 'organizationIdentifier', 'OU', 'C'];
  const parts: string[] = [];
  for (const key of order) {
    if (dn[key]) parts.push(`${key}=${dn[key]}`);
  }
  for (const [key, val] of Object.entries(dn)) {
    if (!order.includes(key)) parts.push(`${key}=${val}`);
  }
  return parts.join(', ');
}

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

function X509DecodedView({ pem }: { pem: string }) {
  const decoded = useMemo(() => decodeX509(pem), [pem]);
  if (!decoded) return <p className="text-sm text-destructive">Unable to decode certificate</p>;
  return (
    <dl className="divide-y divide-border rounded-md border border-border bg-muted/30">
      <DecodedRow label="Subject" value={formatDN(decoded.subject)} />
      <DecodedRow label="Issuer" value={formatDN(decoded.issuer)} />
      <DecodedRow label="Serial Number" value={decoded.serialNumber} mono />
      <DecodedRow label="Not Before" value={decoded.notBefore} />
      <DecodedRow label="Not After" value={decoded.notAfter} />
      <DecodedRow label="Signature Algorithm" value={decoded.signatureAlgorithm} />
      <DecodedRow label="Public Key" value={decoded.publicKeyAlgorithm} />
      {decoded.sanDns.length > 0 && (
        <DecodedRow label="SAN (DNS)" value={decoded.sanDns.join(', ')} />
      )}
      {decoded.crlDistributionPoints.length > 0 && (
        <DecodedRow label="CRL Distribution" value={decoded.crlDistributionPoints.join(', ')} mono />
      )}
    </dl>
  );
}

export default function IntermediaryDashboard() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rp, setRp] = useState<any>(null);
  const [mediatedRPs, setMediatedRPs] = useState<any[]>([]);
  const [accessCerts, setAccessCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [expandedCert, setExpandedCert] = useState<string | null>(null);

  // Access cert form
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessDns, setAccessDns] = useState(accessCertPreset.dns.join(', '));
  const [accessPubKey, setAccessPubKey] = useState('');

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const [rpData, mediated, certs] = await Promise.all([
        getWRP(id),
        listMediatedRPs(token, id),
        listIntermediaryAccessCerts(token, id),
      ]);
      setRp(rpData);
      setMediatedRPs(mediated);
      setAccessCerts(certs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (!token) { navigate('/sign-in'); return; }
    load();
  }, [token, navigate, load]);

  const openAccessForm = () => {
    setShowAccessForm(true);
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

  const handleCreateAccessCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    setCreating('access');
    setMessage('');
    try {
      const dnsEntries = accessDns.split(',').map((s) => s.trim()).filter(Boolean);
      await createIntermediaryAccessCert(token, id, {
        publicKey: accessPubKey,
        dns: dnsEntries.length > 0 ? dnsEntries : undefined,
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

  const handleRevokeAccessCert = async (certId: string) => {
    if (!token || !id) return;
    setMessage('');
    try {
      await revokeIntermediaryAccessCert(token, id, certId);
      setMessage('Access certificate revoked.');
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!token || !id) return;
    if (!confirm('Delete this intermediary?')) return;
    try {
      await deleteIntermediary(token, id);
      navigate('/dashboard');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-40" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }
  if (!rp) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-10 text-center text-sm text-muted-foreground">Intermediary not found.</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{rp.tradeName || rp.legalName}</h1>
            <Badge variant="secondary">Intermediary</Badge>
          </div>
          {rp.legalName && rp.tradeName && <p className="text-sm text-muted-foreground">{rp.legalName}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href="https://dev.api.hopae.com/registrar/api" target="_blank" rel="noopener noreferrer">
              API Docs
            </a>
          </Button>
          <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto">
            <Trash2 className="size-4" />
            Delete Intermediary
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
          <TabsTrigger value="access">Access Certs</TabsTrigger>
          <TabsTrigger value="mediated">Mediated RPs</TabsTrigger>
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

        {/* Access Certificates (WRPAC) */}
        <TabsContent value="access" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <ShieldCheck className="size-5 text-primary" />
                Access Certificates (WRPAC)
              </h2>
              <p className="text-sm text-muted-foreground">
                X.509 certificates for mTLS access. A fresh EC P-256 key pair is generated for each certificate.
              </p>
            </div>
            <Button
              onClick={showAccessForm ? () => setShowAccessForm(false) : openAccessForm}
              disabled={creating !== null}
              variant={showAccessForm ? 'secondary' : 'default'}
              className="w-full sm:w-auto"
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
          </div>

          {showAccessForm && (
            <form onSubmit={handleCreateAccessCert}>
              <Card className="gap-5 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Create Access Certificate</h3>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={prefillAccessForm}>
                    Prefill
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="access-dns">DNS Entries (comma-separated)</Label>
                    <Input
                      id="access-dns"
                      value={accessDns}
                      onChange={(e) => setAccessDns(e.target.value)}
                      placeholder="verify.hopae.com, api.example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="access-pubkey">Public Key (EC P-256 PEM)</Label>
                    <Textarea
                      id="access-pubkey"
                      value={accessPubKey}
                      onChange={(e) => setAccessPubKey(e.target.value)}
                      rows={5}
                      className="font-mono text-xs"
                      placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAccessForm(false)}
                    disabled={creating !== null}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating !== null || !accessPubKey} className="w-full sm:w-auto">
                    {creating === 'access' ? 'Creating...' : 'Create Certificate'}
                  </Button>
                </div>
              </Card>
            </form>
          )}

          {accessCerts.length === 0 && !showAccessForm ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">No access certificates.</Card>
          ) : (
            <div className="space-y-4">
              {accessCerts.map((cert: any) => (
                <Card
                  key={cert.id}
                  className={cn('gap-4 p-5', cert.revokedAt && 'border-destructive/40 bg-destructive/5')}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm break-all">Serial: {cert.id}</span>
                      {cert.revokedAt && <Badge variant="destructive">Revoked</Badge>}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedCert(expandedCert === cert.id ? null : cert.id)}
                        className="w-full sm:w-auto"
                      >
                        {expandedCert === cert.id ? 'Hide' : 'Show'} Raw PEM
                      </Button>
                      {!cert.revokedAt && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeAccessCert(cert.id)}
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
                    {cert.dns?.length > 0 && <span>DNS: {cert.dns.join(', ')}</span>}
                  </div>
                  {cert.certificate && <X509DecodedView pem={cert.certificate} />}
                  {expandedCert === cert.id && (
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">{cert.certificate}</pre>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mediated RPs */}
        <TabsContent value="mediated" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Mediated Relying Parties</h2>
              <p className="text-sm text-muted-foreground">
                Relying Parties that use your intermediary services to connect with EUDI Wallets.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to={`/dashboard/intermediary/${id}/register-rp`}>
                <Plus className="size-4" />
                Register Mediated RP
              </Link>
            </Button>
          </div>

          {mediatedRPs.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Building2 className="size-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No Mediated RPs Yet</p>
                <p className="text-sm text-muted-foreground">
                  Register Relying Parties that will use your intermediary services.
                </p>
              </div>
              <Button asChild>
                <Link to={`/dashboard/intermediary/${id}/register-rp`}>
                  <Plus className="size-4" />
                  Register Mediated RP
                </Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediatedRPs.map((mrp: any) => (
                <Link to={`/dashboard/intermediary/${id}/rp/${mrp.id}`} key={mrp.id} className="group block">
                  <Card className="h-full gap-3 p-5 transition-colors hover:border-primary/50 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h3 className="font-semibold tracking-tight group-hover:text-primary">
                          {mrp.tradeName || mrp.legalName || 'Unnamed'}
                        </h3>
                        {mrp.legalName && mrp.tradeName && (
                          <p className="text-xs text-muted-foreground">{mrp.legalName}</p>
                        )}
                      </div>
                      <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {mrp.srvDescription?.[0]?.content?.slice(0, 100)}...
                    </p>
                    <div className="mt-auto pt-2">
                      <Badge variant="secondary">Reg Certs: {mrp.registrationCertificates?.length ?? 0}</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
