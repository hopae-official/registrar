import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWRPs, getMyIntermediaries, listMediatedRPs } from '../api/client';

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [wrps, setWrps] = useState<any[]>([]);
  const [intermediaries, setIntermediaries] = useState<any[]>([]);
  const [mediatedRPsByIntermediary, setMediatedRPsByIntermediary] = useState<Record<string, any[]>>({});
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

      // Load mediated RPs for each intermediary
      if (intData.length > 0) {
        const mediatedMap: Record<string, any[]> = {};
        await Promise.all(
          intData.map(async (int: any) => {
            try {
              mediatedMap[int.id] = await listMediatedRPs(token, int.id);
            } catch {
              mediatedMap[int.id] = [];
            }
          }),
        );
        setMediatedRPsByIntermediary(mediatedMap);
      }
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
  const hasIntermediaries = intermediaries.length > 0;

  return (
    <div className="page">
      <h1>Dashboard</h1>

      {loading && <p className="loading">Loading...</p>}

      {/* Empty state — onboarding */}
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

      {/* My Relying Parties — only shown when NOT an intermediary user */}
      {!loading && !hasIntermediaries && wrps.length > 0 && (
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

      {/* Intermediary view — show each intermediary with its mediated RPs inline */}
      {!loading && intermediaries.map((int: any) => {
        const mediated = mediatedRPsByIntermediary[int.id] ?? [];
        return (
          <section className="section" key={int.id}>
            <div className="section-header">
              <div>
                <h2>{int.tradeName || int.legalName}</h2>
                <div className="rp-tags" style={{ marginTop: 4 }}>
                  <span className="tag tag-blue">Intermediary</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {int.identifier?.[0]?.value}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/dashboard/intermediary/${int.id}`} className="btn btn-secondary btn-sm">
                  Manage
                </Link>
                <Link to={`/dashboard/intermediary/${int.id}/register-rp`} className="btn btn-primary btn-sm">
                  Register Mediated RP
                </Link>
              </div>
            </div>

            {mediated.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">&#128203;</div>
                <p className="empty-state-title">No Mediated RPs Yet</p>
                <p className="empty-state-desc">
                  Register Relying Parties that will use your intermediary services.
                </p>
                <Link to={`/dashboard/intermediary/${int.id}/register-rp`} className="btn btn-primary">
                  Register Mediated RP
                </Link>
              </div>
            ) : (
              <div className="rp-grid">
                {mediated.map((rp: any) => (
                  <Link to={`/dashboard/intermediary/${int.id}/rp/${rp.id}`} key={rp.id} className="rp-card">
                    <h3>{rp.tradeName || rp.legalName || 'Unnamed'}</h3>
                    {rp.legalName && rp.tradeName && <p className="legal-name">{rp.legalName}</p>}
                    <div className="rp-tags">
                      <span className="tag tag-purple">Mediated RP</span>
                    </div>
                    <p className="rp-desc">{rp.srvDescription?.[0]?.content?.slice(0, 100)}...</p>
                    <div className="rp-stats">
                      <span>Reg Certs: {rp.registrationCertificates?.length ?? 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
