import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

function JWTDecodedView({ jwt }: { jwt: string }) {
  const decoded = useMemo(() => decodeJWT(jwt), [jwt]);
  if (!decoded) return <p className="decode-error">Unable to decode JWT</p>;

  const { header, payload } = decoded;
  const headerSummary = `alg=${header.alg}, typ=${header.typ}`;
  const hasX5c = Array.isArray(header.x5c) && header.x5c.length > 0;

  return (
    <div className="decoded-grid">
      <div className="decoded-row">
        <span className="decoded-label">Header</span>
        <span className="decoded-value mono">{headerSummary}{hasX5c ? `, x5c[${header.x5c.length}]` : ''}</span>
      </div>
      {payload.iss && (
        <div className="decoded-row">
          <span className="decoded-label">Issuer (iss)</span>
          <span className="decoded-value">{payload.iss}</span>
        </div>
      )}
      {payload.sub && (
        <div className="decoded-row">
          <span className="decoded-label">Subject (sub)</span>
          <span className="decoded-value mono">{payload.sub}</span>
        </div>
      )}
      {payload.jti && (
        <div className="decoded-row">
          <span className="decoded-label">JWT ID (jti)</span>
          <span className="decoded-value mono">{payload.jti}</span>
        </div>
      )}
      {payload.iat && (
        <div className="decoded-row">
          <span className="decoded-label">Issued At</span>
          <span className="decoded-value">{new Date(payload.iat * 1000).toISOString()}</span>
        </div>
      )}
      {payload.name && (
        <div className="decoded-row">
          <span className="decoded-label">Name</span>
          <span className="decoded-value">{payload.name}</span>
        </div>
      )}
      {payload.legal_name && (
        <div className="decoded-row">
          <span className="decoded-label">Legal Name</span>
          <span className="decoded-value">{payload.legal_name}</span>
        </div>
      )}
      {payload.country && (
        <div className="decoded-row">
          <span className="decoded-label">Country</span>
          <span className="decoded-value">{payload.country}</span>
        </div>
      )}
      {payload.registry_uri && (
        <div className="decoded-row">
          <span className="decoded-label">Registry URI</span>
          <span className="decoded-value mono">{payload.registry_uri}</span>
        </div>
      )}
      {payload.intermediary && (
        <div className="decoded-row">
          <span className="decoded-label">Intermediary</span>
          <span className="decoded-value">{payload.intermediary.sname} ({payload.intermediary.sub})</span>
        </div>
      )}
      {payload.entitlements && (
        <div className="decoded-row">
          <span className="decoded-label">Entitlements</span>
          <span className="decoded-value">
            {(Array.isArray(payload.entitlements) ? payload.entitlements : [payload.entitlements])
              .map((e: string) => e.split('/').pop())
              .join(', ')}
          </span>
        </div>
      )}
      {payload.support_uri && (
        <div className="decoded-row">
          <span className="decoded-label">Support URI</span>
          <span className="decoded-value">{payload.support_uri}</span>
        </div>
      )}
      {payload.privacy_policy && (
        <div className="decoded-row">
          <span className="decoded-label">Privacy Policy</span>
          <span className="decoded-value">{payload.privacy_policy}</span>
        </div>
      )}
      {payload.purpose && (
        <div className="decoded-row">
          <span className="decoded-label">Purpose</span>
          <span className="decoded-value">
            {Array.isArray(payload.purpose)
              ? payload.purpose.map((p: any) => p.content || p).join('; ')
              : String(payload.purpose)}
          </span>
        </div>
      )}
      {payload.dpa && (
        <div className="decoded-row">
          <span className="decoded-label">DPA</span>
          <span className="decoded-value">
            {[payload.dpa.uri, payload.dpa.email, payload.dpa.phone].filter(Boolean).join(' | ')}
          </span>
        </div>
      )}
    </div>
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

  if (loading) return <div className="page"><p className="loading">Loading...</p></div>;
  if (!rp) return <div className="page"><p className="empty">Mediated RP not found.</p></div>;

  return (
    <div className="page">
      <div className="detail-header">
        <div>
          <h1>{rp.tradeName || rp.legalName}</h1>
          {rp.legalName && rp.tradeName && <p className="legal-name">{rp.legalName}</p>}
          <div className="rp-tags">
            <span className="tag tag-purple">Mediated RP</span>
          </div>
        </div>
        <div className="detail-header-actions">
          <Link to={`/dashboard/intermediary/${intermediaryId}`} className="btn btn-secondary">
            Back to Intermediary
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>Delete RP</button>
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

      {/* Registration Certificates (WRPRC) */}
      <section className="section">
        <div className="section-header">
          <h2>Registration Certificates (WRPRC)</h2>
          <button
            className="btn btn-primary"
            onClick={showRegForm ? () => setShowRegForm(false) : openRegForm}
            disabled={creating !== null}
          >
            {showRegForm ? 'Cancel' : 'Create Registration Cert'}
          </button>
        </div>
        <p className="subtitle">
          JWT-based registration certificates (rc-wrp+jwt) signed with ES256. The intermediary reference is automatically included.
        </p>

        {showRegForm && (
          <form className="form-panel" onSubmit={handleCreateRegCert}>
            <div className="form-panel-header">
              <h3>Create Registration Certificate</h3>
              <button type="button" className="btn btn-sm text-link-sm" onClick={prefillRegForm}>Prefill</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Support URI</label>
                <input value={regSupportUri} onChange={(e) => setRegSupportUri(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Privacy Policy URI</label>
                <input value={regPrivacyPolicy} onChange={(e) => setRegPrivacyPolicy(e.target.value)} required />
              </div>

              <div className="form-section-title">Purpose</div>
              <div className="form-group">
                <label>Language</label>
                <input value={regPurposeLang} onChange={(e) => setRegPurposeLang(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Content</label>
                <input value={regPurposeContent} onChange={(e) => setRegPurposeContent(e.target.value)} />
              </div>

              <div className="form-section-title">Credentials</div>
              <div className="form-group form-full">
                <div className="credential-presets">
                  <button type="button" className={`credential-preset-card ${regCredentialPreset === 'pid' ? 'credential-preset-active' : ''}`} onClick={() => applyCredentialPreset('pid')}>
                    <span className="credential-preset-title">PID</span>
                    <span className="credential-preset-desc">Name, birth date, address</span>
                  </button>
                  <button type="button" className={`credential-preset-card ${regCredentialPreset === 'ageVerification' ? 'credential-preset-active' : ''}`} onClick={() => applyCredentialPreset('ageVerification')}>
                    <span className="credential-preset-title">Age Verification</span>
                    <span className="credential-preset-desc">Age over 18 check</span>
                  </button>
                  <button type="button" className={`credential-preset-card ${regCredentialPreset === 'custom' ? 'credential-preset-active' : ''}`} onClick={() => applyCredentialPreset('custom')}>
                    <span className="credential-preset-title">Custom</span>
                    <span className="credential-preset-desc">Define your own claims</span>
                  </button>
                </div>
                <textarea
                  className="json-textarea"
                  value={regCredentials}
                  onChange={(e) => setRegCredentials(e.target.value)}
                  readOnly={!regCredentialCustom}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRegForm(false)} disabled={creating !== null}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating !== null}>
                {creating === 'registration' ? 'Creating...' : 'Create Certificate'}
              </button>
            </div>
          </form>
        )}

        {regCerts.length === 0 && !showRegForm ? (
          <p className="empty">No registration certificates.</p>
        ) : (
          <div className="cert-list">
            {regCerts.map((cert: any) => (
              <div key={cert.id} className={`cert-card ${cert.revokedAt ? 'cert-revoked' : ''}`}>
                <div className="cert-header">
                  <div>
                    <span className="cert-id">ID: {cert.id}</span>
                    {cert.revokedAt && <span className="tag tag-red">Revoked</span>}
                  </div>
                  <div className="cert-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => setExpandedCert(expandedCert === `reg-${cert.id}` ? null : `reg-${cert.id}`)}
                    >
                      {expandedCert === `reg-${cert.id}` ? 'Hide' : 'Show'} Raw JWT
                    </button>
                    {!cert.revokedAt && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleRevokeRegCert(cert.id)}>
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
                <div className="cert-meta">
                  <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>
                {cert.jwt && <JWTDecodedView jwt={cert.jwt} />}
                {expandedCert === `reg-${cert.id}` && (
                  <pre className="cert-pem">{cert.jwt}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
