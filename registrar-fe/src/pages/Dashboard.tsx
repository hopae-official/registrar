import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWRPs, createWRP, listWRPs } from '../api/client';
import {
  intermediaryPreset,
  normalRPPreset,
  rpWithIntermediaryPreset,
} from '../presets/data';

interface FormData {
  legalName: string;
  tradeName: string;
  identifierType: string;
  identifierValue: string;
  infoURI: string;
  email: string;
  phone: string;
  supportURI: string;
  srvDescriptionLang: string;
  srvDescriptionContent: string;
  intendedUse: string; // JSON
  isPSB: boolean;
  entitlement: string;
  supervisoryAuthorityName: string;
  supervisoryAuthorityEmail: string;
  supervisoryAuthorityPhone: string;
  supervisoryAuthorityURI: string;
  isIntermediary: boolean;
  usesIntermediary: string; // JSON
}

function presetToForm(preset: any): FormData {
  return {
    legalName: preset.legalName ?? '',
    tradeName: preset.tradeName ?? '',
    identifierType: preset.identifier?.[0]?.type ?? 'EUID',
    identifierValue: preset.identifier?.[0]?.value ?? '',
    infoURI: (preset.infoURI ?? []).join(', '),
    email: preset.email ?? '',
    phone: preset.phone ?? '',
    supportURI: (preset.supportURI ?? []).join(', '),
    srvDescriptionLang: preset.srvDescription?.[0]?.lang ?? 'en',
    srvDescriptionContent: preset.srvDescription?.[0]?.content ?? '',
    intendedUse: JSON.stringify(preset.intendedUse ?? [], null, 2),
    isPSB: preset.isPSB ?? false,
    entitlement: (preset.entitlement ?? []).join('\n'),
    supervisoryAuthorityName: preset.supervisoryAuthority?.legalName ?? '',
    supervisoryAuthorityEmail: preset.supervisoryAuthority?.email ?? '',
    supervisoryAuthorityPhone: preset.supervisoryAuthority?.phone ?? '',
    supervisoryAuthorityURI: (preset.supervisoryAuthority?.infoURI ?? []).join(', '),
    isIntermediary: preset.isIntermediary ?? false,
    usesIntermediary: preset.usesIntermediary
      ? JSON.stringify(preset.usesIntermediary, null, 2)
      : '',
  };
}

function formToDto(form: FormData): any {
  const dto: any = {
    legalName: form.legalName,
    tradeName: form.tradeName || undefined,
    identifier: [{ type: form.identifierType, value: form.identifierValue }],
    infoURI: form.infoURI ? form.infoURI.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    email: form.email || undefined,
    phone: form.phone || undefined,
    supportURI: form.supportURI.split(',').map((s) => s.trim()).filter(Boolean),
    srvDescription: [{ lang: form.srvDescriptionLang, content: form.srvDescriptionContent }],
    isPSB: form.isPSB,
    entitlement: form.entitlement.split('\n').map((s) => s.trim()).filter(Boolean),
    supervisoryAuthority: {
      legalName: form.supervisoryAuthorityName,
      email: form.supervisoryAuthorityEmail || undefined,
      phone: form.supervisoryAuthorityPhone || undefined,
      infoURI: form.supervisoryAuthorityURI
        ? form.supervisoryAuthorityURI.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    },
    isIntermediary: form.isIntermediary,
  };

  try {
    dto.intendedUse = JSON.parse(form.intendedUse);
  } catch {
    dto.intendedUse = [];
  }

  if (form.usesIntermediary.trim()) {
    try {
      dto.usesIntermediary = JSON.parse(form.usesIntermediary);
    } catch {
      /* skip */
    }
  }

  return dto;
}

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rps, setRps] = useState<any[]>([]);
  const [globalIntermediaries, setGlobalIntermediaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [showForm, setShowForm] = useState<string | null>(null); // 'normal' | 'intermediary' | 'withIntermediary'
  const [form, setForm] = useState<FormData>(presetToForm(normalRPPreset));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [myData, interData] = await Promise.all([
        getMyWRPs(token),
        listWRPs({ isintermediary: 'true' }),
      ]);
      setRps(myData);
      setGlobalIntermediaries(interData.items);
    } catch {
      setRps([]);
      setGlobalIntermediaries([]);
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

  const openForm = (type: string) => {
    if (type === 'normal') {
      setForm(presetToForm(normalRPPreset));
    } else if (type === 'intermediary') {
      setForm(presetToForm(intermediaryPreset));
    } else if (type === 'withIntermediary' && globalIntermediaries.length > 0) {
      const inter = globalIntermediaries[0];
      const preset = rpWithIntermediaryPreset({
        identifier: inter.identifier,
        tradeName: inter.tradeName,
        registryURI: inter.registryURI,
      });
      setForm(presetToForm(preset));
    }
    setShowForm(type);
    setMessage('');
  };

  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setMessage('');
    try {
      const dto = formToDto(form);
      const rp = await createWRP(token, dto);
      setMessage(`Registered "${rp.tradeName || rp.legalName}" successfully!`);
      setShowForm(null);
      await load();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page">
      <h1>Company Dashboard</h1>

      {message && (
        <div className={`alert ${message.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <section className="section">
        <h2>Register New Relying Party</h2>
        <p className="subtitle">
          Select a preset to open the registration form with pre-filled data.
        </p>

        <div className="preset-grid">
          <div className={`preset-card ${showForm === 'normal' ? 'preset-active' : ''}`}>
            <h3>Normal RP</h3>
            <div className="preset-details">
              <span>Entitlement: Service Provider</span>
              <span>Intermediary: No</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => openForm('normal')}
              disabled={creating}
            >
              {showForm === 'normal' ? 'Editing...' : 'Register Normal RP'}
            </button>
          </div>

          <div className={`preset-card ${showForm === 'intermediary' ? 'preset-active' : ''}`}>
            <h3>Intermediary</h3>
            <div className="preset-details">
              <span>Entitlement: Service Provider</span>
              <span>Intermediary: Yes</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => openForm('intermediary')}
              disabled={creating}
            >
              {showForm === 'intermediary' ? 'Editing...' : 'Register Intermediary'}
            </button>
          </div>

          <div className={`preset-card ${showForm === 'withIntermediary' ? 'preset-active' : ''}`}>
            <h3>RP with Intermediary</h3>
            {globalIntermediaries.length === 0 ? (
              <p className="preset-hint">
                Register an intermediary first to enable this option.
              </p>
            ) : (
              <div className="preset-details">
                <span>Entitlement: Service Provider</span>
                <span>With Intermediary</span>
              </div>
            )}
            <button
              className="btn btn-primary"
              onClick={() => openForm('withIntermediary')}
              disabled={creating || globalIntermediaries.length === 0}
            >
              {showForm === 'withIntermediary'
                ? 'Editing...'
                : 'Register RP with Intermediary'}
            </button>
          </div>
        </div>

        {/* Inline Registration Form */}
        {showForm && (
          <form className="form-panel" onSubmit={handleSubmit}>
            <h3>
              {showForm === 'normal' && 'Register Normal RP'}
              {showForm === 'intermediary' && 'Register Intermediary'}
              {showForm === 'withIntermediary' && 'Register RP with Intermediary'}
            </h3>

            <div className="form-grid">
              <div className="form-group">
                <label>Legal Name</label>
                <input
                  value={form.legalName}
                  onChange={(e) => updateForm('legalName', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Trade Name</label>
                <input
                  value={form.tradeName}
                  onChange={(e) => updateForm('tradeName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Identifier Type</label>
                <input
                  value={form.identifierType}
                  onChange={(e) => updateForm('identifierType', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Identifier Value</label>
                <input
                  value={form.identifierValue}
                  onChange={(e) => updateForm('identifierValue', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Info URIs (comma-separated)</label>
                <input
                  value={form.infoURI}
                  onChange={(e) => updateForm('infoURI', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Support URIs (comma-separated)</label>
                <input
                  value={form.supportURI}
                  onChange={(e) => updateForm('supportURI', e.target.value)}
                  required
                />
              </div>

              <div className="form-section-title">Service Description</div>
              <div className="form-group">
                <label>Language</label>
                <input
                  value={form.srvDescriptionLang}
                  onChange={(e) => updateForm('srvDescriptionLang', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  value={form.srvDescriptionContent}
                  onChange={(e) => updateForm('srvDescriptionContent', e.target.value)}
                  required
                />
              </div>

              <div className="form-section-title">Options</div>
              <div className="form-group">
                <div className="form-check">
                  <input
                    type="checkbox"
                    id="isPSB"
                    checked={form.isPSB}
                    onChange={(e) => updateForm('isPSB', e.target.checked)}
                  />
                  <label htmlFor="isPSB">Is PSB (Public Sector Body)</label>
                </div>
              </div>
              <div className="form-group">
                <div className="form-check">
                  <input
                    type="checkbox"
                    id="isIntermediary"
                    checked={form.isIntermediary}
                    onChange={(e) => updateForm('isIntermediary', e.target.checked)}
                  />
                  <label htmlFor="isIntermediary">Is Intermediary</label>
                </div>
              </div>

              <div className="form-group form-full">
                <label>Entitlements (one per line)</label>
                <textarea
                  value={form.entitlement}
                  onChange={(e) => updateForm('entitlement', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="form-section-title">Supervisory Authority</div>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={form.supervisoryAuthorityName}
                  onChange={(e) => updateForm('supervisoryAuthorityName', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  value={form.supervisoryAuthorityEmail}
                  onChange={(e) => updateForm('supervisoryAuthorityEmail', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  value={form.supervisoryAuthorityPhone}
                  onChange={(e) => updateForm('supervisoryAuthorityPhone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Info URIs (comma-separated)</label>
                <input
                  value={form.supervisoryAuthorityURI}
                  onChange={(e) => updateForm('supervisoryAuthorityURI', e.target.value)}
                />
              </div>

              <div className="form-section-title">Intended Use (JSON)</div>
              <div className="form-group form-full">
                <label>Intended Use</label>
                <textarea
                  className="json-textarea"
                  value={form.intendedUse}
                  onChange={(e) => updateForm('intendedUse', e.target.value)}
                />
              </div>

              {form.usesIntermediary && (
                <>
                  <div className="form-section-title">Uses Intermediary (JSON)</div>
                  <div className="form-group form-full">
                    <label>Intermediary References</label>
                    <textarea
                      className="json-textarea"
                      value={form.usesIntermediary}
                      onChange={(e) => updateForm('usesIntermediary', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(null)}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="section">
        <h2>My Relying Parties</h2>
        {loading ? (
          <p className="loading">Loading...</p>
        ) : rps.length === 0 ? (
          <p className="empty">
            No relying parties registered yet. Use the presets above to get started.
          </p>
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
