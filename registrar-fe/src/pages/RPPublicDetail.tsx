import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWRP } from '../api/client';

export default function RPPublicDetail() {
  const { id } = useParams<{ id: string }>();
  const [rp, setRp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getWRP(id)
      .then(setRp)
      .catch(() => setRp(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><p className="loading">Loading...</p></div>;
  if (!rp) return <div className="page"><p className="empty">Relying party not found.</p></div>;

  return (
    <div className="page">
      <Link to="/" className="back-link">Back to Registry</Link>

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
          {rp.usesIntermediary?.length > 0 && (
            <div className="info-item">
              <span className="info-label">Intermediary</span>
              <span className="info-value">
                {rp.usesIntermediary.map((inter: any, i: number) => (
                  <span key={i}>{inter.tradeName} ({inter.identifier?.[0]?.value})</span>
                ))}
              </span>
            </div>
          )}
        </div>
      </section>

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
    </div>
  );
}
