import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWRPs } from '../api/client';

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async (legalname?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (legalname) params.legalname = legalname;
      const data = await listWRPs(params);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search || undefined);
  };

  return (
    <div className="page">
      <div className="hero">
        <div className="hero-inner">
          <span className="hero-tag">EU Digital Identity Wallet</span>
          <h1>Wallet Relying Party Registry</h1>
          <p>
            Official registry of Wallet-Relying Parties authorized under the
            EUDI framework.
          </p>
        </div>
      </div>

      <p className="subtitle">
        {total} registered {total === 1 ? 'party' : 'parties'}
      </p>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search by legal or trade name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : items.length === 0 ? (
        <p className="empty">No relying parties found.</p>
      ) : (
        <div className="rp-grid">
          {items.map((rp: any) => (
            <Link to={`/rp/${rp.id}`} key={rp.id} className="rp-card">
              <h3>{rp.tradeName || rp.legalName || 'Unnamed'}</h3>
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
              <p className="rp-desc">
                {rp.srvDescription?.[0]?.content?.slice(0, 120)}
                {rp.srvDescription?.[0]?.content?.length > 120 ? '...' : ''}
              </p>
              <div className="rp-meta">
                {rp.identifier?.map((id: any, i: number) => (
                  <span key={i} className="identifier">
                    {id.type}: {id.value}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
