import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWRPs } from '../api/client';

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rps, setRps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const myData = await getMyWRPs(token);
      setRps(myData);
    } catch {
      setRps([]);
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

  return (
    <div className="page">
      <h1>Company Dashboard</h1>

      <section className="section">
        <div className="section-header">
          <h2>My Relying Parties</h2>
          <Link to="/dashboard/register" className="btn btn-primary">
            Register
          </Link>
        </div>
        {loading ? (
          <p className="loading">Loading...</p>
        ) : rps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128203;</div>
            <p className="empty-state-title">No Relying Parties Yet</p>
            <p className="empty-state-desc">
              Register your first Relying Party to start managing certificates and wallet integrations.
            </p>
            <Link to="/dashboard/register" className="btn btn-primary">
              Register Relying Party
            </Link>
          </div>
        ) : (
          <div className="rp-grid">
            {rps.map((rp: any) => (
              <Link
                to={`/dashboard/rp/${rp.id}`}
                key={rp.id}
                className="rp-card"
              >
                <h3>{rp.tradeName || rp.legalName || 'Unnamed'}</h3>
                {rp.legalName && rp.tradeName && (
                  <p className="legal-name">{rp.legalName}</p>
                )}
                <div className="rp-tags">
                  {rp.isIntermediary && (
                    <span className="tag tag-blue">Intermediary</span>
                  )}
                  {rp.isPSB && <span className="tag tag-green">PSB</span>}
                  {rp.usesIntermediary?.length > 0 && (
                    <span className="tag tag-purple">Uses Intermediary</span>
                  )}
                </div>
                <p className="rp-desc">
                  {rp.srvDescription?.[0]?.content?.slice(0, 100)}...
                </p>
                <div className="rp-stats">
                  <span>Access Certs: {rp.accessCertificates?.length ?? 0}</span>
                  <span>Reg Certs: {rp.registrationCertificates?.length ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
