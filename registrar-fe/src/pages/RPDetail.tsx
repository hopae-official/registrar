import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getWRP,
  listAccessCerts,
  listRegistrationCerts,
  createAccessCert,
  createRegistrationCert,
  revokeAccessCert,
  revokeRegistrationCert,
  deleteWRP,
  generateECP256KeyPair,
} from '../api/client';
import { registrationCertPreset, accessCertPreset } from '../presets/data';

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
  const [generatingKey, setGeneratingKey] = useState(false);

  // Registration cert form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regSupportUri, setRegSupportUri] = useState(registrationCertPreset.support_uri);
  const [regPrivacyPolicy, setRegPrivacyPolicy] = useState(registrationCertPreset.privacy_policy);
  const [regPurposeLang, setRegPurposeLang] = useState(registrationCertPreset.purpose[0].lang);
  const [regPurposeContent, setRegPurposeContent] = useState(registrationCertPreset.purpose[0].content);
  const [regCredentials, setRegCredentials] = useState(JSON.stringify(registrationCertPreset.credentials, null, 2));
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

  const openAccessForm = async () => {
    setShowAccessForm(true);
    setShowRegForm(false);
    setAccessDns(accessCertPreset.dns.join(', '));
    setAccessPubKey('');
    setGeneratingKey(true);
    try {
      const key = await generateECP256KeyPair();
      setAccessPubKey(key);
    } catch (err: any) {
      setAccessPubKey(`Error generating key: ${err.message}`);
    } finally {
      setGeneratingKey(false);
    }
  };

  const openRegForm = () => {
    setShowRegForm(true);
    setShowAccessForm(false);
    setRegSupportUri(registrationCertPreset.support_uri);
    setRegPrivacyPolicy(registrationCertPreset.privacy_policy);
    setRegPurposeLang(registrationCertPreset.purpose[0].lang);
    setRegPurposeContent(registrationCertPreset.purpose[0].content);
    setRegCredentials(JSON.stringify(registrationCertPreset.credentials, null, 2));
    // Pre-fill intermediary ID from RP's usesIntermediary reference
    const interRef = rp?.usesIntermediary?.[0];
    const interId = interRef?.registryURI?.replace(/^\/wrp\//, '') ?? '';
    setRegIntermediary(interId);
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

  if (loading) return <div className="page"><p className="loading">Loading...</p></div>;
  if (!rp) return <div className="page"><p className="empty">Relying party not found.</p></div>;

  return (
    <div className="page">
      <div className="detail-header">
        <div>
          <h1>{rp.tradeName || rp.legalName}</h1>
          {rp.legalName && rp.tradeName && (
            <p className="legal-name">{rp.legalName}</p>
          )}
          <div className="rp-tags">
            {rp.isIntermediary && <span className="tag tag-blue">Intermediary</span>}
            {rp.isPSB && <span className="tag tag-green">PSB</span>}
            {rp.usesIntermediary?.length > 0 && (
              <span className="tag tag-purple">Uses Intermediary</span>
            )}
          </div>
        </div>
        {token && (
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete RP
          </button>
        )}
      </div>

      {message && (
        <div className={`alert ${message.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {/* RP Info */}
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
            <span className="info-value">
              {rp.srvDescription?.[0]?.content || '-'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Entitlements</span>
            <span className="info-value">
              {rp.entitlement?.map((e: string) => e.split('/').pop()).join(', ') || '-'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Supervisory Authority</span>
            <span className="info-value">
              {rp.supervisoryAuthority?.legalName || '-'}
            </span>
          </div>
          {rp.usesIntermediary?.length > 0 && (
            <div className="info-item">
              <span className="info-label">Intermediary</span>
              <span className="info-value">
                {rp.usesIntermediary.map((inter: any, i: number) => (
                  <span key={i}>
                    {inter.tradeName} ({inter.identifier?.[0]?.value})
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Intended Use */}
      {rp.intendedUse?.length > 0 && (
        <section className="section">
          <h2>Intended Uses</h2>
          {rp.intendedUse.map((iu: any, i: number) => (
            <div key={i} className="intended-use-card">
              <p><strong>Purpose:</strong> {iu.purpose?.[0]?.content}</p>
              <p><strong>Privacy Policy:</strong> {iu.privacyPolicy?.[0]?.uri}</p>
              <p><strong>Credentials:</strong> {iu.credential?.map((c: any) => c.format).join(', ')}</p>
              {iu.intendedUseIdentifier && (
                <p className="iu-id">ID: {iu.intendedUseIdentifier}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Access Certificates */}
      <section className="section">
        <div className="section-header">
          <h2>Access Certificates</h2>
          {token && (
            <button
              className="btn btn-primary"
              onClick={showAccessForm ? () => setShowAccessForm(false) : openAccessForm}
              disabled={creating !== null}
            >
              {showAccessForm ? 'Cancel' : 'Create Access Cert'}
            </button>
          )}
        </div>
        <p className="subtitle">
          X.509 certificates for mTLS access. A fresh EC P-256 key pair is generated for each certificate.
        </p>

        {/* Access Cert Form */}
        {showAccessForm && (
          <form className="form-panel" onSubmit={handleCreateAccessCert}>
            <h3>Create Access Certificate</h3>
            <div className="form-grid">
              <div className="form-group form-full">
                <label>DNS Entries (comma-separated)</label>
                <input
                  value={accessDns}
                  onChange={(e) => setAccessDns(e.target.value)}
                  placeholder="verify.hopae.com, api.example.lu"
                />
              </div>
              <div className="form-group form-full">
                <label>Public Key (EC P-256, auto-generated)</label>
                <textarea
                  readOnly
                  value={generatingKey ? 'Generating key pair...' : accessPubKey}
                  rows={5}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAccessForm(false)}
                disabled={creating !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  setGeneratingKey(true);
                  try {
                    setAccessPubKey(await generateECP256KeyPair());
                  } catch (err: any) {
                    setAccessPubKey(`Error: ${err.message}`);
                  } finally {
                    setGeneratingKey(false);
                  }
                }}
                disabled={generatingKey || creating !== null}
              >
                Regenerate Key
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating !== null || generatingKey || !accessPubKey}
              >
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
                    {cert.revokedAt && (
                      <span className="tag tag-red">Revoked</span>
                    )}
                  </div>
                  <div className="cert-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setExpandedCert(expandedCert === cert.id ? null : cert.id)
                      }
                    >
                      {expandedCert === cert.id ? 'Hide' : 'Show'} PEM
                    </button>
                    {token && !cert.revokedAt && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRevokeAccessCert(cert.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
                <div className="cert-meta">
                  <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                  {cert.dns?.length > 0 && (
                    <span>DNS: {cert.dns.join(', ')}</span>
                  )}
                </div>
                {expandedCert === cert.id && (
                  <pre className="cert-pem">{cert.certificate}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Registration Certificates */}
      <section className="section">
        <div className="section-header">
          <h2>Registration Certificates</h2>
          {token && (
            <button
              className="btn btn-primary"
              onClick={showRegForm ? () => setShowRegForm(false) : openRegForm}
              disabled={creating !== null}
            >
              {showRegForm ? 'Cancel' : 'Create Registration Cert'}
            </button>
          )}
        </div>
        <p className="subtitle">
          JWT-based registration certificates (rc-wrp+jwt) signed with ES256.
        </p>

        {/* Registration Cert Form */}
        {showRegForm && (
          <form className="form-panel" onSubmit={handleCreateRegCert}>
            <h3>Create Registration Certificate</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Support URI</label>
                <input
                  value={regSupportUri}
                  onChange={(e) => setRegSupportUri(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Privacy Policy URI</label>
                <input
                  value={regPrivacyPolicy}
                  onChange={(e) => setRegPrivacyPolicy(e.target.value)}
                  required
                />
              </div>

              <div className="form-section-title">Purpose</div>
              <div className="form-group">
                <label>Language</label>
                <input
                  value={regPurposeLang}
                  onChange={(e) => setRegPurposeLang(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <input
                  value={regPurposeContent}
                  onChange={(e) => setRegPurposeContent(e.target.value)}
                />
              </div>

              <div className="form-section-title">Credentials (JSON)</div>
              <div className="form-group form-full">
                <label>Credentials</label>
                <textarea
                  className="json-textarea"
                  value={regCredentials}
                  onChange={(e) => setRegCredentials(e.target.value)}
                />
              </div>

              <div className="form-section-title">Intermediary (optional)</div>
              <div className="form-group form-full">
                <label>Intermediary RP ID</label>
                <input
                  value={regIntermediary}
                  onChange={(e) => setRegIntermediary(e.target.value)}
                  placeholder="Leave empty if not using intermediary"
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRegForm(false)}
                disabled={creating !== null}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating !== null}
              >
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
                    {cert.revokedAt && (
                      <span className="tag tag-red">Revoked</span>
                    )}
                  </div>
                  <div className="cert-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        setExpandedCert(
                          expandedCert === `reg-${cert.id}` ? null : `reg-${cert.id}`,
                        )
                      }
                    >
                      {expandedCert === `reg-${cert.id}` ? 'Hide' : 'Show'} JWT
                    </button>
                    {token && !cert.revokedAt && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRevokeRegCert(cert.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
                <div className="cert-meta">
                  <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>
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
