import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

function X509DecodedView({ pem }: { pem: string }) {
  const decoded = useMemo(() => decodeX509(pem), [pem]);
  if (!decoded) return <p className="decode-error">Unable to decode certificate</p>;
  return (
    <div className="decoded-grid">
      <div className="decoded-row">
        <span className="decoded-label">Subject</span>
        <span className="decoded-value">{formatDN(decoded.subject)}</span>
      </div>
      <div className="decoded-row">
        <span className="decoded-label">Issuer</span>
        <span className="decoded-value">{formatDN(decoded.issuer)}</span>
      </div>
      <div className="decoded-row">
        <span className="decoded-label">Serial Number</span>
        <span className="decoded-value mono">{decoded.serialNumber}</span>
      </div>
      <div className="decoded-row">
        <span className="decoded-label">Not Before</span>
        <span className="decoded-value">{decoded.notBefore}</span>
      </div>
      <div className="decoded-row">
        <span className="decoded-label">Not After</span>
        <span className="decoded-value">{decoded.notAfter}</span>
      </div>
      <div className="decoded-row">
        <span className="decoded-label">Signature Algorithm</span>
        <span className="decoded-value">{decoded.signatureAlgorithm}</span>
      </div>
      <div className="decoded-row">
        <span className="decoded-label">Public Key</span>
        <span className="decoded-value">{decoded.publicKeyAlgorithm}</span>
      </div>
      {decoded.sanDns.length > 0 && (
        <div className="decoded-row">
          <span className="decoded-label">SAN (DNS)</span>
          <span className="decoded-value">{decoded.sanDns.join(', ')}</span>
        </div>
      )}
      {decoded.crlDistributionPoints.length > 0 && (
        <div className="decoded-row">
          <span className="decoded-label">CRL Distribution</span>
          <span className="decoded-value mono">{decoded.crlDistributionPoints.join(', ')}</span>
        </div>
      )}
    </div>
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

  if (loading) return <div className="page"><p className="loading">Loading...</p></div>;
  if (!rp) return <div className="page"><p className="empty">Intermediary not found.</p></div>;

  return (
    <div className="page">
      <div className="detail-header">
        <div>
          <h1>{rp.tradeName || rp.legalName}</h1>
          {rp.legalName && rp.tradeName && <p className="legal-name">{rp.legalName}</p>}
          <div className="rp-tags">
            <span className="tag tag-blue">Intermediary</span>
          </div>
        </div>
        <div className="detail-header-actions">
          <button className="btn btn-danger" onClick={handleDelete}>Delete Intermediary</button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {/* Info */}
      <section className="section">
        <h2>Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Registry URI</span>
            <span className="info-value">{rp.registryURI}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Identifiers</span>
            <span className="info-value">
              {rp.identifier?.map((id: any, i: number) => (
                <span key={i}>{id.type}: {id.value}</span>
              ))}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Email</span>
            <span className="info-value">{rp.email || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Phone</span>
            <span className="info-value">{rp.phone || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Support</span>
            <span className="info-value">{rp.supportURI?.join(', ') || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Description</span>
            <span className="info-value">{rp.srvDescription?.[0]?.content || '-'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Entitlements</span>
            <span className="info-value">
              {rp.entitlement?.map((e: string) => e.split('/').pop()).join(', ') || '-'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Supervisory Authority</span>
            <span className="info-value">{rp.supervisoryAuthority?.legalName || '-'}</span>
          </div>
        </div>
      </section>

      {/* Access Certificates (WRPAC) */}
      <section className="section">
        <div className="section-header">
          <h2>Access Certificates (WRPAC)</h2>
          <button
            className="btn btn-primary"
            onClick={showAccessForm ? () => setShowAccessForm(false) : openAccessForm}
            disabled={creating !== null}
          >
            {showAccessForm ? 'Cancel' : 'Create Access Cert'}
          </button>
        </div>
        <p className="subtitle">
          X.509 certificates for mTLS access. A fresh EC P-256 key pair is generated for each certificate.
        </p>

        {showAccessForm && (
          <form className="form-panel" onSubmit={handleCreateAccessCert}>
            <div className="form-panel-header">
              <h3>Create Access Certificate</h3>
              <button type="button" className="btn btn-sm text-link-sm" onClick={prefillAccessForm}>Prefill</button>
            </div>
            <div className="form-grid">
              <div className="form-group form-full">
                <label>DNS Entries (comma-separated)</label>
                <input
                  value={accessDns}
                  onChange={(e) => setAccessDns(e.target.value)}
                  placeholder="verify.hopae.com, api.example.com"
                />
              </div>
              <div className="form-group form-full">
                <label>Public Key (EC P-256 PEM)</label>
                <textarea
                  value={accessPubKey}
                  onChange={(e) => setAccessPubKey(e.target.value)}
                  rows={5}
                  placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAccessForm(false)} disabled={creating !== null}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating !== null || !accessPubKey}>
                {creating === 'access' ? 'Creating...' : 'Create Certificate'}
              </button>
            </div>
          </form>
        )}

        {accessCerts.length === 0 && !showAccessForm ? (
          <p className="empty">No access certificates.</p>
        ) : (
          <div className="cert-list">
            {accessCerts.map((cert: any) => (
              <div key={cert.id} className={`cert-card ${cert.revokedAt ? 'cert-revoked' : ''}`}>
                <div className="cert-header">
                  <div>
                    <span className="cert-id">Serial: {cert.id}</span>
                    {cert.revokedAt && <span className="tag tag-red">Revoked</span>}
                  </div>
                  <div className="cert-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => setExpandedCert(expandedCert === cert.id ? null : cert.id)}
                    >
                      {expandedCert === cert.id ? 'Hide' : 'Show'} Raw PEM
                    </button>
                    {!cert.revokedAt && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleRevokeAccessCert(cert.id)}>
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
                <div className="cert-meta">
                  <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                  {cert.dns?.length > 0 && <span>DNS: {cert.dns.join(', ')}</span>}
                </div>
                {cert.certificate && <X509DecodedView pem={cert.certificate} />}
                {expandedCert === cert.id && (
                  <pre className="cert-pem">{cert.certificate}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mediated RPs */}
      <section className="section">
        <div className="section-header">
          <h2>Mediated Relying Parties</h2>
          <Link to={`/dashboard/intermediary/${id}/register-rp`} className="btn btn-primary">
            Register Mediated RP
          </Link>
        </div>
        <p className="subtitle">
          Relying Parties that use your intermediary services to connect with EUDI Wallets.
        </p>

        {mediatedRPs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128203;</div>
            <p className="empty-state-title">No Mediated RPs Yet</p>
            <p className="empty-state-desc">
              Register Relying Parties that will use your intermediary services.
            </p>
            <Link to={`/dashboard/intermediary/${id}/register-rp`} className="btn btn-primary">
              Register Mediated RP
            </Link>
          </div>
        ) : (
          <div className="rp-grid">
            {mediatedRPs.map((mrp: any) => (
              <Link to={`/dashboard/intermediary/${id}/rp/${mrp.id}`} key={mrp.id} className="rp-card">
                <h3>{mrp.tradeName || mrp.legalName || 'Unnamed'}</h3>
                {mrp.legalName && mrp.tradeName && <p className="legal-name">{mrp.legalName}</p>}
                <p className="rp-desc">{mrp.srvDescription?.[0]?.content?.slice(0, 100)}...</p>
                <div className="rp-stats">
                  <span>Reg Certs: {mrp.registrationCertificates?.length ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
