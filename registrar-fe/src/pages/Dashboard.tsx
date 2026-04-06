import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWRPs, getMyIntermediaries } from '../api/client';

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [wrps, setWrps] = useState<any[]>([]);
  const [intermediaries, setIntermediaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wrpData, intData] = await Promise.all([
        getMyWRPs(token),
        getMyIntermediaries(token),
      ]);
      setWrps(wrpData);
      setIntermediaries(intData);
    } catch {
      setWrps([]);
      setIntermediaries([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/sign-in');
      return;
    }
    load();
  }, [token, navigate, load]);

  const isEmpty = !loading && wrps.length === 0 && intermediaries.length === 0;

  return (
    <div className="page">
      <h1>Dashboard</h1>

      {loading && <p className="loading">Loading...</p>}

      {/* Empty state — same as onboarding */}
      {isEmpty && (
        <div className="onboarding-grid">
          <div className="onboarding-card">
            <div className="onboarding-icon">&#127970;</div>
            <h2>Relying Party</h2>
            <p>
              Register your organization as a Wallet-Relying Party to directly
              interact with EUDI Wallets and request user attributes.
            </p>
            <Link to="/dashboard/register" className="btn btn-primary btn-full">
              Register as Relying Party
            </Link>
          </div>
          <div className="onboarding-card">
            <div className="onboarding-icon">&#128279;</div>
            <h2>Intermediary</h2>
            <p>
              Register as an intermediary to act on behalf of other Relying Parties,
              connecting them to EUDI Wallets.
            </p>
            <Link to="/dashboard/register-intermediary" className="btn btn-primary btn-full">
              Register as Intermediary
            </Link>
          </div>
        </div>
      )}

      {/* My Relying Parties */}
      {!loading && wrps.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>My Relying Parties</h2>
            <Link to="/dashboard/register" className="btn btn-primary btn-sm">
              Register RP
            </Link>
          </div>
          <div className="rp-grid">
            {wrps.map((rp: any) => (
              <Link to={`/dashboard/rp/${rp.id}`} key={rp.id} className="rp-card">
                <h3>{rp.tradeName || rp.legalName || 'Unnamed'}</h3>
                {rp.legalName && rp.tradeName && <p className="legal-name">{rp.legalName}</p>}
                <div className="rp-tags">
                  {rp.isPSB && <span className="tag tag-green">PSB</span>}
                </div>
                <p className="rp-desc">{rp.srvDescription?.[0]?.content?.slice(0, 100)}...</p>
                <div className="rp-stats">
                  <span>Access Certs: {rp.accessCertificates?.length ?? 0}</span>
                  <span>Reg Certs: {rp.registrationCertificates?.length ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My Intermediaries */}
      {!loading && intermediaries.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>My Intermediaries</h2>
            <Link to="/dashboard/register-intermediary" className="btn btn-primary btn-sm">
              Register Intermediary
            </Link>
          </div>
          <div className="rp-grid">
            {intermediaries.map((rp: any) => (
              <Link to={`/dashboard/intermediary/${rp.id}`} key={rp.id} className="rp-card">
                <h3>{rp.tradeName || rp.legalName || 'Unnamed'}</h3>
                {rp.legalName && rp.tradeName && <p className="legal-name">{rp.legalName}</p>}
                <div className="rp-tags">
                  <span className="tag tag-blue">Intermediary</span>
                </div>
                <p className="rp-desc">{rp.srvDescription?.[0]?.content?.slice(0, 100)}...</p>
                <div className="rp-stats">
                  <span>Access Certs: {rp.accessCertificates?.length ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions when not empty */}
      {!isEmpty && !loading && (
        <section className="section" style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {wrps.length === 0 && (
              <Link to="/dashboard/register" className="btn btn-secondary">
                Register Relying Party
              </Link>
            )}
            {intermediaries.length === 0 && (
              <Link to="/dashboard/register-intermediary" className="btn btn-secondary">
                Register Intermediary
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
